'use strict'
var mpc;
var reqpool = [];

(function() {
    var peer = 'p' + (0 | Math.random() * 900 + 100);
    var hub = 'somehub';
    var servers = [
        'wss://localhost:55555',
        'wss://192.168.11.4:55555',
        'wss://192.168.11.5:55555',
        'wss://192.168.11.6:55555',
        'wss://192.168.11.7:55555',
        'wss://minichat.gatherhub.com:55555'];
    var iceservers = [{'url': 'stun:stun.l.google.com:19302'}, {'url': 'stun:chi2-tftp2.starnetusa.net'}];
    var pc = mpc = new Gatherhub.PeerCom({peer: peer, hub: hub, servers: servers, iceservers: iceservers});
    var _peers = {};
    var cstate = 'idle';
    var cparty = {};
    var w = $(window).width() > 360 ? 320 : (0 | ($(window).width() * 0.8) / 10) * 10;
    var h = 0 | (w / 8 * 5);

    pc.onerror = function (e) { console.log(e); };
    pc.onstatechange = function (s) {
        // log PeerCom state in console
        console.log(s);

        // clear peer list
        if (s == 'starting') { $('#pgroup').children().remove(); }
        // add myself as on top of peer list as the host
        if (s == 'started') { addPeer(pc, 1); }
    };
    pc.onpeerchange = function (peers) {
        // Check for new joined peers and add them to peer list
        var keys = Object.keys(peers).filter(function(e){return !(e in _peers);});
        keys.forEach(function(i) {        
            addPeer({id: i, peer: peers[i].peer}, false);
            _peers[i] = peers[i];
        });

        // Check for left peers and remove them from peer list
        keys = Object.keys(_peers).filter(function(e){return !(e in peers);});
        keys.forEach(function(i) {
            // if the left peer is currently on a call, end the call
            if (cparty.id == i) { endcall(); }
            $('#' + i).parent().appendTo(drawer);
            delete _peers[i];
        });
    };
    pc.onmessage = function (msg) {
        // show message in console
        console.log('\nfrom:', msg.from);
        console.log('type:', msg.type);
        console.log('data:', msg.data);
        console.log('ts:', msg.ts);
        console.log('via:', msg.via);
    };
    pc.onmediarequest = function (req) {
        // Notify UI to respond to remote requests / answers
        switch (req.type) {
            case 'offer':
                if (cstate == 'idle') {
                    reqpool.push(req);
                    cparty.id = req.from;
                    cstate = 'incoming';
                    $('.panel-heading').find('button').toggle();
                    $('#' + cparty.id).find('.btn-group').append(btnaccept).append(btnreject);
                    $('.panel-heading').parent().first().toggle();
                    $('#' + cparty.id).parent().toggle();
                    $('#' + cparty.id).parent().parent().children().toggle();
                }
                break;
            case 'answer':
                btncancel.appendTo(drawer);
                $('#' + req.from).find('.btn-group').append(btnend);
                cparty.req = req;
                addmedia();
                cstate = 'busy';
                break;
            case 'cancel':
            case 'reject':
            case 'end':
                cleanup();
                break;
        }
    };

    // create peer list container
    $('<h3>').html('Peer List:').appendTo('#layer1');
    $('<div class="panel-group" id="pgroup">').appendTo('#layer1');

    // create reusable html elements
    var drawer = $('<div>');
    var btncancel = $('<button>').addClass('btn btn-sm btn-danger').html('cancel').on('click', cancelcall);
    var btnaccept = $('<button>').addClass('btn btn-sm btn-success').html('accept').on('click', acceptcall);
    var btnreject = $('<button>').addClass('btn btn-sm btn-danger').html('reject').on('click', rejectcall);
    var btnend = $('<button>').addClass('btn btn-sm btn-danger').html('end').on('click', endcall);
    var vpad = $('<div align="center" >').width(w).height(h).css({position: 'relative', top: 0, left: ($(window).width() - w)/3, 'margin-top': 10});
    var rvid = $('<video autoplay>').width(w).height(h).css({position: 'absolute', top: 0, right: 0}).appendTo(vpad);
    var lvid = $('<video autoplay muted>').width(0 | (w/3)).height(0 | (h/3)).css({position: 'absolute', top: 0, right: 0}).appendTo(vpad);

    function addPeer(peer, host) {
        if (!peer || $('#' + peer.id).length) { return; }

        var panel = $('<div class="panel-heading" style="position: relative, width: 100%, display: table">').html(peer.peer).attr({id: peer.id});
        var d2 = $('<div>').css({'margin-top': -20, 'display': 'inline-block table-cell', 'text-align': 'right'}).appendTo(panel);
        var bgroup = $('<div class="btn-group">').appendTo(d2);
        if (host) {
            $('<div class="panel panel-primary">').appendTo('#pgroup').append(panel);
        }
        else {
            $('<div class="panel panel-success">').appendTo('#pgroup').append(panel);
            $('<button>').addClass('btn btn-sm btn-warning').html('video').appendTo(bgroup).on('click', makecall);
            $('<button>').addClass('btn btn-sm btn-primary').html('audio').appendTo(bgroup).on('click', makecall);
            if (cstate != 'idle') {
                panel.find('button').toggle();
                panel.parent().toggle();
            }
        }

    }

    function makecall() {
        var pid = cparty.id = $(this).parents('.panel-heading').attr('id');
        var mdesc = $(this).html() == 'video' ? {audio: true, video: {mandatory: {minWidth: 160, minWidth: 100, maxWidth: 160, maxHeight:100}}} : {audio: true};
        $('.panel-heading').find('button').toggle();
        $('#' + pid).find('.btn-group').append(btncancel);
        $('.panel-heading').parent().first().toggle();
        $('#' + pid).parent().toggle();
        $('#' + pid).parent().parent().children().toggle();
        var req = pc.mediaRequest({to: pid, mdesc: mdesc});
        reqpool.push({id: req, to: pid, mdesc: mdesc});
        cstate = 'calling';
    }

    function acceptcall() {
        var req = reqpool.pop();

        if (req) {
            pc.mediaResponse(req, 'accept');
            btnaccept.parent().append(btnend);
            btnreject.appendTo(drawer);
            btnaccept.appendTo(drawer);
            cparty.req = req;
            addmedia();
            reqpool.push(req);
            cstate = 'busy';
        }
    }

    function cancelcall() {
        var req = reqpool.pop();
        if (req) { pc.medchans[req.id].cancel(); }
        cleanup();
    }

    function rejectcall() {
        var req = reqpool.pop();
        if (req) { pc.mediaResponse(req, 'reject'); }
        cleanup();
    }

    function endcall() {
        var req = reqpool.pop();
        if (req) { pc.medchans[req.id].end(); }
        cleanup();
    }

    function cleanup() {
        reqpool.pop();
        btnaccept.appendTo(drawer);
        btnreject.appendTo(drawer);
        btncancel.appendTo(drawer);
        btnend.appendTo(drawer);
        vpad.appendTo(drawer);
        $('.panel-heading').find('button').toggle();
        $('.panel-heading').parent().first().toggle();
        $('#' + cparty.id).parent().toggle();
        $('#' + cparty.id).parent().parent().children().toggle();
        cstate = 'idle';
    }

    function addmedia() {
        setTimeout(
            function() {
                var x = pc.medchans[cparty.req.id].lstream.getTracks().find(
                    function(e) {
                        return e.kind == 'video';
                    }
                );
                if (x) {
                    lvid.attr({src:  URL.createObjectURL(pc.medchans[cparty.req.id].lstream)});
                    rvid.attr({src:  URL.createObjectURL(pc.medchans[cparty.req.id].rstream)});
                    vpad.appendTo('#' + cparty.id);
                }
                else {
                    $('<audio autoplay muted>').attr({src: URL.createObjectURL(pc.medchans[cparty.req.id].lstream)}).appendTo('body').toggle();
                    $('<audio autoplay>').attr({src: URL.createObjectURL(pc.medchans[cparty.req.id].rstream)}).appendTo('body').toggle();
                }
            }
            , 1000);
    }
})();
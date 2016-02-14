'use strict'
// Include dependent script
// include PeerCom Module

// Main Process
var mpc;
var reqpool = [];

(function(){
    var peer = 'p' + (0 | Math.random() * 900 + 100);
    var hub = 'somehub';
    var servers = ['wss://localhost:55555', 'wss://192.168.11.7:55555', 'wss://minichat.gatherhub.com:55555'];
    var iceservers = [{'url': 'stun:stun.l.google.com:19302'}, {'url': 'stun:chi2-tftp2.starnetusa.net'}];
    var pc = mpc = new Gatherhub.PeerCom({peer: peer, hub: hub, servers: servers, iceservers: iceservers});
    var _peers = {};
    var cstate = 'idle';
    var cparty = {};

    pc.onerror = function (e) { console.log(e); };
    pc.onstatechange = function (s) {
        console.log(s);
        // Handling process
        if (s == 'started') addPeer(pc, true);
        if (s == 'starting') $('#pgroup').children().remove();
    };
    pc.onpeerchange = function (peers) {
        // console.log('Peers changed (' + Object.keys(peers).length + ')');
        // Update Peer List in UI
        var keys = Object.keys(peers).filter(function(e){return !(e in _peers);});
        keys.forEach(function(i) {        
            addPeer({id: i, peer: peers[i].peer}, false);
            _peers[i] = peers[i];
        });

        keys = Object.keys(_peers).filter(function(e){return !(e in peers);});
        keys.forEach(function(i) {
            $('#' + i).parent().appendTo(drawer);
            delete _peers[i];
        });
    };
    pc.onmessage = function (msg) {
        console.log('\nfrom:', msg.from);
        console.log('type:', msg.type);
        console.log('data:', msg.data);
        console.log('ts:', msg.ts);
        console.log('via:', msg.via);
        // Update message console in UI
    };
    pc.onmediarequest = function (req) {
        // Notify UI to respond to request
        switch (req.type) {
            case 'offer':
                if (cstate == 'idle') {
                    reqpool.push(req);
                    $('.panel-heading').children().toggle();
                    $('#' + req.from).append(btnaccept).append(btnreject);
                    cparty.id = req.from;
                    cstate = 'incoming';
                }
                break;
            case 'answer':
                btncancel.appendTo(drawer);
                $('#' + req.from).append(btnend);
                cparty.req = req;
                addmedia();
                cstate = 'busy';
                break;
            case 'cancel':
                reqpool.pop();
                btnaccept.appendTo(drawer);
                btnreject.appendTo(drawer);
                $('.panel-heading').children().toggle();
                cstate = 'idle';
                break;
            case 'reject':
                reqpool.pop();
                btncancel.appendTo(drawer);
                $('.panel-heading').children().toggle();
                cstate = 'idle';
                break;
            case 'end':
                reqpool.pop();
                btnend.appendTo(drawer);
                $('.panel-heading').children().toggle();
                cstate = 'idle';
                break;
        }
    };

    $('<h3>').html('Peer List:').appendTo('#layer1');
    $('<div class="panel-group" id="pgroup">').appendTo('#layer1');
    var drawer = $('<div>');
    var btncancel = $('<button>').addClass('pull-right').html('cancel').on('click', cancelcall);
    var btnaccept = $('<button>').addClass('pull-right').html('accept').on('click', acceptcall);
    var btnreject = $('<button>').addClass('pull-right').html('reject').on('click', rejectcall);
    var btnend = $('<button>').addClass('pull-right').html('end').on('click', endcall);
    var vpad = $('<div align="center">').css({position: 'relative', top: 0, right: 0}).width(320).height(240);
    var rvid = $('<video autoplay>').css({position: 'absolute', top: 0, left: 0}).width(320).height(240).appendTo(vpad);
    var lvid = $('<video autoplay muted>').css({position: 'absolute', top: 0, right: 0}).width(120).height(90).appendTo(vpad);

    function addPeer(peer, host) {
        if (!peer || $('#' + peer.id).length) return;

        var panel = $('<div class="panel-heading">').attr({id: peer.id}).html(peer.peer);
        if (host) {
            $('<div class="panel panel-primary">').appendTo('#pgroup').append(panel);
        }
        else {
            $('<div class="panel panel-success">').appendTo('#pgroup').append(panel);
            $('<button>').addClass('pull-right').html('audio').appendTo(panel).on('click', makecall);
            $('<button>').addClass('pull-right').html('video').appendTo(panel).on('click', makecall);
            if (cstate != 'idle') panel.children('button').toggle();
        }

    }

    function makecall() {
        var pid = cparty.id = $(this).parent().attr('id');
        var mdesc = $(this).html() == 'video' ? {audio: true, video: {mandatory: {maxWidth: 320, maxHeight:240}}} : {audio: true};
        $('.panel-heading').children().toggle();
        $('#' + pid).append(btncancel);
        var req = pc.mediaRequest({to: pid, mdesc: mdesc});
        reqpool.push({id: req, to: pid, mdesc: mdesc});
        cstate = 'calling';
    }

    function cancelcall() {
        var req = reqpool.pop();
        if (req) {
            pc.medchans[req.id].cancel();
            btncancel.appendTo(drawer);
            $('.panel-heading').children().toggle();
            cstate = 'idle';
        }
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

    function rejectcall() {
        var req = reqpool.pop();
        if (req) {
            pc.mediaResponse(req, 'reject');
            btnreject.appendTo(drawer);
            btnaccept.appendTo(drawer);
            $('.panel-heading').children().toggle();
            cstate = 'idle';
        }
    }

    function endcall() {
        var req = reqpool.pop();
        if (req) {
            pc.medchans[req.id].end();
            btnend.appendTo(drawer);
            $('.panel-heading').children().toggle();
            cstate = 'idle';
        }
    }

    function addmedia() {
        console.log(cparty)
        setTimeout(
            function() {
                var x = pc.medchans[cparty.req.id].lstream.getTracks().find(
                    function(e) {
                        return e.kind == 'video';
                    }
                );
                console.log(x)
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
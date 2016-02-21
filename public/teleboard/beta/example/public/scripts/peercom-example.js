'use strict'

// declared variable in public space for the convenience of debugging
var mpc;
var reqpool = [];
var confparty = [];

(function() {
    var peer;   // = 'p' + (0 | Math.random() * 900 + 100);
    var hub = 'lobby';
    var servers = ['wss://www.gatherhub.com:55688'];
    var iceservers = [
        {'urls': 'stun:stun01.sipphone.com'},
        {'urls': 'stun:stun.fwdnet.net'},
        {'urls': 'stun:stun.voxgratia.org'},
        {'urls': 'stun:stun.xten.com'},
        {'urls': 'stun:chi2-tftp2.starnetusa.net'},
        {'urls': 'stun:stun.l.google.com:19302'}
    ];
    var _peers = {};        // a shadow copy of peers for comparison for changes
    var cstate = 'idle';    // log call state
    var cparty, cid, creq;  // calling party element, peer id, request
    var retrymedia =  0;

    // get the width and height (w, h) of video to better fit the device screen
    // video source is set to 320:200 (16:10) ratio, so the w:h should be 16:10 too
    var w = $(window).width() > 360 ? 320 : (0 | ($(window).width() * 0.8) / 10) * 10;
    var h = 0 | (w / 8 * 5);

    // create PeerCom Object and configure event handlers
    var pc = mpc = new Gatherhub.PeerCom({peer: peer, hub: hub, servers: servers, iceservers: iceservers});
    pc.onerror = function (e) {
        // just log error message in the console
        console.log(e);
        // critical errors, such as browser not support webrtc, prompt in alert window
        if (e.code < 0) { alert(e.reason); }
    };
    pc.onstatechange = function (s) {
        // Update PeerCom state in Peer List Title
        $('#title').html('You are in Hub#[' + hub + '] (' + s + ')');

        // clear peer list when PeerCom service starting or stopped
        if (s == 'starting') {
            $('#pgroup').children().remove();
        }
        if (s == 'stopped') {
            $('#pgroup').children().remove();
            pc.start();
        }

        // add myself as on top of peer list as the host
        else if (s == 'started') {
            addPeer(pc, 1);
        }
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
            if (cid == i) { endcall('end'); }      // if the left peer is current call party, end the call
            $('#' + i).parent().remove();
            delete _peers[i];
        });

        // sorting peers
        $('.panel-success').sort(function(a, b){
            return ($(a).find('span').html() > $(b).find('span').html()) ? 1 : -1;
        }).appendTo('#pgroup');
    };
    pc.onpeerstatechange = function(s) {
        if (s.state == 'open') { 
            if (pc.support.video && pc.peers[s.peer].support.video) {
                $('#' + s.peer).find('.btn-warning').attr('disabled', false);
            }
            if (pc.support.audio && pc.peers[s.peer].support.audio) {
                $('#' + s.peer).find('.btn-primary').attr('disabled', false);
            }
        }
    };
    pc.onmessage = function (msg) {
        // log message in console, may add text messaging feature later
        console.log('from:', msg.from);
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
                    var ctype = req.mdesc.video ? 'video' : 'audio';
                    reqpool.push(req);
                    cid = req.from;
                    cparty = $('#' + cid);
                    cstate = 'ringing';
                    $('.panel-success').find('button').toggle();
                    cparty.find('.btn-group').append(btnaccept).append(btnreject);
                    cparty.parents('.panel-success').toggle();
                    $('.panel-success').toggle();
                    cparty.children('span').html(cparty.children('span').html() + ' (' + ctype + ' call)');
                    $('#host').find('.btn-success').attr('disabled', true);
                    ring.play();
                }
                break;
            case 'answer':
                ringback.pause();
                btncancel.appendTo(drawer);
                $('#' + req.from).find('.btn-group').append(btnmute).append(btnend);
                creq = req;
                addmedia();
                cstate = 'busy';
                break;
            case 'cancel':
            case 'reject':
            case 'end':
                if (cstate == 'busy') {
                    if (req.from == cid) { cleanup(); }
                }
                else {
                    ring.pause();
                    cleanup();
                }
                break;
        }
    };

    // Enable login button [Enter] when user name is not empty
    $('#enter').on('click', function() { login(); }).attr('disabled', true);
    $('#user').on('keyup', function(e) {
        if (this.value.length) {
            $('#enter').attr('disabled', false);
            if (e.keyCode == 13) { login(); }
        }
    }).on('focus blur', function() {
        if (this.value.length) { $('#enter').attr('disabled', false); }
        else { $('#enter').attr('disabled', true); }
    });
    $('#hub').on('keyup', function(e){
        if (!$('#enter').attr('disabled') && e.keyCode == 13) { login(); }
    });
    $('#cache').on('keyup', function(e){
        if (!$('#enter').attr('disabled') && e.keyCode == 13) { login(); }
    });
    setTimeout(function() { $('#user').focus().select(); }, 100);

    // load values from cookies if available
    if (getCookie('user') && getCookie('user').length > 0) { $('#user').val(getCookie('user')); }
    if (getCookie('hub') && getCookie('hub').length > 0) { $('#hub').val(getCookie('hub')); }
    if (getCookie('cache')) { $('#cache').attr('checked', getCookie('cache')); }

    // create peer list container
    $('#layer1').attr('align', 'center').hide();
    $('<h3 id="title">').appendTo('#layer1');
    $('<div class="panel-group" id="pgroup" style="max-width: 640px" align="left">').appendTo('#layer1');

    // create reusable html elements

    // ringtone element
    var ring = new Audio('http://gatherhub.com/ring.mp3');
    var ringback = new Audio('http://gatherhub.com/ringback.mp3');
    ring.load();
    ringback.load();
    ring.loop = true;
    ringback.loop = true;

    // Audio elements
    var au = [];
    for (var i = 0; i < 16; i++) {
        var a = new Audio();
        au.push(a);
    }

    // drawer is virtual container which is never append to the page but to collect unused elements by $.appendTo(drawer)
    var drawer = $('<div>');
    // buttons that will only have single appearance in the page
    var btnaccept = $('<button>').addClass('btn btn-sm btn-success').html('accept').on('click', acceptcall);
    var btnreject = $('<button>').addClass('btn btn-sm btn-danger').html('reject').on('click', function() { endcall('reject'); });
    var btncancel = $('<button>').addClass('btn btn-sm btn-danger').html('cancel').on('click', function() { endcall('cancel'); });
    var btnend = $('<button>').addClass('btn btn-sm btn-danger').html('end').on('click', function() { endcall('end'); });
    var btnmute = $('<button>').addClass('btn btn-sm btn-warning').html('mute').on('click', mutecall);
    // css for video frame arrangement
    var tlalign = {position: 'absolute', top: 0, left: 0}
    var tralign = {position: 'absolute', top: 0, right: 0}
    var blalign = {position: 'absolute', bottom: 0, left: 0};
    var bralign = {position: 'absolute', bottom: 0, right: 0};
    var bcalign = {position: 'absolute', bottom: 0, left: '25%'};
    var vborder = {'border-style': 'solid', 'border-width': 1, 'border-color': 'grey'};

    // window size for video frames
    var hw = 0 | (w/2);
    var hh = 0 | (h/2);
    var sw = 0 | (w/3);
    var sh = 0 | (h/3);

    // video frames
    var vpad = $('<div>').width(w).height(h).css({position: 'relative'});
    var fullview = $('<video autoplay>').width(w).height(h).css(tlalign).hide().appendTo(vpad);
    var localview = $('<video autoplay>').width(sw).height(sh).css(bralign).css(vborder).hide().appendTo(vpad);
    var tlview = $('<video autoplay>').width(hw).height(hh).css(tlalign).hide().appendTo(vpad);
    var trview = $('<video autoplay>').width(hw).height(hh).css(tralign).hide().appendTo(vpad);
    var blview = $('<video autoplay>').width(hw).height(hh).css(blalign).hide().appendTo(vpad);
    var brview = $('<video autoplay>').width(hw).height(hh).css(bralign).css(vborder).hide().appendTo(vpad);
    var bcview = $('<video autoplay>').width(hw).height(hh).css(bcalign).css(vborder).hide().appendTo(vpad);

    // Login to hub
    function login() {
        // set/clear cookies
        if ($('#cache').is(':checked')) {
            setCookie('user', $('#user').val());
            setCookie('hub', $('#hub').val());
            setCookie('cache', $('#cache').is(':checked'));
        }
        else {
            setCookie('user', '');
            setCookie('hub', '');
            setCookie('cache', '');
        }

        peer = $('#user').val();
        if ($('#hub').val().length) { hub = $('#hub').val(); }
        $('#layer0').hide();
        $('#layer1').show();
        pc.peer = peer;
        pc.hub = hub;
        svcStart();
    }

    // dynamically create peer elements in peer list panel group
    function addPeer(peer, host) {
        if (!peer || $('#' + peer.id).length) { return; }

        var panel = $('<div class="panel-heading" style="position: relative, maxWidth: 100%, display: table">').attr({id: peer.id});
        var pbody = $('<div class="panel-body" align="center">').hide();
        var s1 = $('<span>').html(peer.peer).appendTo(panel);
        var d2 = $('<div>').css({'margin-top': -20, 'display': 'inline-block table-cell', 'text-align': 'right'}).appendTo(panel);
        var bgroup = $('<div class="btn-group">').appendTo(d2);

        if (host) {
            $('<div id="host" class="panel panel-primary">').appendTo('#pgroup').append(panel);
                if (pc.support.video || pc.support.audio) {
                $('<button>').addClass('btn btn-sm btn-success').html('conference').appendTo(bgroup).on('click', prepconf);
                if (pc.support.video) {
                    $('<button>').addClass('btn btn-sm btn-warning').html('video').attr('disabled', true).appendTo(bgroup).on('click', makeconf).toggle();
                }
                if (pc.support.audio) {
                    $('<button>').addClass('btn btn-sm btn-primary').html('audio').attr('disabled', true).appendTo(bgroup).on('click', makeconf).toggle();
                }
                $('<button>').addClass('btn btn-sm btn-danger').html('cancel').appendTo(bgroup).on('click', cancelconf).toggle();
            }
        }
        else {
            $('<div class="panel panel-success">').appendTo('#pgroup').append(panel).append(pbody);
            $('<button>').addClass('btn btn-sm btn-warning').html('video').attr('disabled', true).appendTo(bgroup).on('click', makecall);
            $('<button>').addClass('btn btn-sm btn-primary').html('audio').attr('disabled', true).appendTo(bgroup).on('click', makecall);
            $('<input type="checkbox" class="peersel">').appendTo(bgroup).on('click', validsel).toggle();

            if (cstate == 'confprep') {
                panel.find('button').toggle()
                panel.find('.peersel').toggle()
                if (!pc.peers[peer.id].support.video && !pc.peers[peer.id].support.audio) {
                    panel.parent().hide();
                }
            }
            else if (cstate != 'idle') {
                panel.find('button').toggle();
                panel.parent().toggle();
            }            
        }

    }

    function prepconf() {
        cstate = 'confprep';

        // change buttons
        $('#host').find('button').toggle();

        // change peer list buttons to checkbox for conference parties selection
        $('.peersel').attr('checked', false);
        $('.panel-success').find('button').toggle()
        $('.panel-success').find('.peersel').toggle()
        $('#host').find('.btn-warning').attr('disabled', true);
        $('#host').find('.btn-primary').attr('disabled', true);

        for (var k in pc.peers) {
            if (!pc.peers[k].support.video && !pc.peers[k].audio) { $('#' + k).parent().hide(); }
        }
     }

    function cancelconf() {
        cleanconf();
    }

    function makeconf() {
        // make request to each selected peer
        var ctype = $(this).html();
        var mdesc = ctype == 'video' ? {audio: true, video: {mandatory: {minWidth: 160, minWidth: 100, maxWidth: 160, maxHeight:100}}} : {audio: true};

        if (confparty.length == 1) {
            cid = confparty[0];
            cancelconf();
            if (ctype == 'video') {
                $('#' + cid).find('.btn-warning').click();
            }
            else {
                $('#' + cid).find('.btn-primary').click();
            }
        }
        else {
            confparty.forEach(function(e) {
                var req = pc.mediaRequest({to: e, mdesc: mdesc});
                if (req) {
                    // queue reqest for later use
                    reqpool.push({id: req, to: cid, mdesc: mdesc});
                }
                else { endcall('cancel'); }
            });

            if (reqpool.length) {
                // change state
                cstate = 'calling';
                ringback.play();
            }
        }
        // check if all conference party support requested media, if not, prompt for user's option
        cstate ='confrequest'
    }

    function endconf() {
        cleanconf();
    }

    function validsel() {
        var cpid = $(this).parents('.panel-heading').attr('id');
        if ($(this).is(':checked')) {
            if (confparty.length < 3) { confparty.push(cpid); }
            else {
                alert('You can select up to three peers at maximum.');
                $(this).attr('checked', false);
            }
        }
        else { if (confparty.indexOf(cpid) > -1) { confparty.splice(confparty.indexOf(cpid), 1); } }

        if (confparty.length) {
            $('#host').find('.btn-warning').attr('disabled', false);
            $('#host').find('.btn-primary').attr('disabled', false);
        }
        else {
            $('#host').find('.btn-warning').attr('disabled', true);
            $('#host').find('.btn-primary').attr('disabled', true);
        }
    }

    function cleanconf() {
        $('#host').find('button').toggle();

        $('.panel-success').find('button').toggle()
        $('.panel-success').find('.peersel').toggle()
        $('.panel-success').show();
        confparty = [];
        cstate = 'idle';
    }

    function makecall() {
        // get target peer id from panel id
        cid = $(this).parents('.panel-heading').attr('id');
        cparty = $('#' + cid);

        // set media description by the button clicked
        var mdesc = $(this).html() == 'video' ? {audio: true, video: {mandatory: {minWidth: 160, minWidth: 100, maxWidth: 160, maxHeight:100}}} : {audio: true};

        // hide default buttons and add cancel button
        $('.panel-success').find('button').toggle();
        cparty.find('.btn-group').append(btncancel);

        // disable conference button
        $('#host').find('.btn-success').attr('disabled', true);

        // hide rest peers but show only taget peer in the list
        cparty.parents('.panel-success').toggle();
        $('.panel-success').toggle();
        cparty.children('span').html(cparty.children('span').html() + ' (' + $(this).html() + ' call)');

        // send request through PeerCom API
        var req = pc.mediaRequest({to: cid, mdesc: mdesc});

        if (req) {
            // queue reqest for later use
            reqpool.push({id: req, to: cid, mdesc: mdesc});

            // change state
            cstate = 'calling';
            ringback.play();
        }
        else { endcall('cancel'); }
    }

    function acceptcall() {
        // stop ringing
        ring.pause();
        // pop out current request
        var req = reqpool.pop();

        if (req) {
            // send response
            // req.mdesc = {audio: true}   // one-way video test
            pc.mediaResponse(req, 'accept');

            // change answering buttons to in-call buttons
            btnaccept.parent().append(btnmute);
            btnaccept.parent().append(btnend);
            btnreject.appendTo(drawer);
            btnaccept.appendTo(drawer);

            creq = req;         // set public variable of request
            addmedia();         // insert media element to page
            reqpool.push(req);  // put request back to queue
            cstate = 'busy';    // change call state
        }
    }

    function mutecall() {
        // pop out current request
        var req = reqpool.pop();
        // mute microphone through PeerCom media channel
        if (req) { pc.medchans[req.id].mute(); }
        // put reqeust back to queue
        reqpool.push(req);

        // update mute button context
        if (btnmute.html() == 'mute') { btnmute.removeClass('btn-warning').addClass('btn-success').html('unmute'); }
        else { btnmute.removeClass('btn-success').addClass('btn-warning').html('mute'); }
    }

    function endcall(reason) {
        var req = reqpool.pop();
        if (req && pc.medchans[req.id]) {
            if (reason == 'reject') { pc.mediaResponse(req, 'reject'); }
            else if (reason == 'cancel') { pc.medchans[req.id].cancel(); }
            else if (reason == 'end') { pc.medchans[req.id].end(); }

            if (cstate == 'ringing') { ring.pause(); }
        }
        cleanup();
    }

    // restore page layout and default elements
    function cleanup() {
        // stop ring/ringback tone();
        ring.pause();
        ringback.pause();

        // stop and clear all audios
        au.forEach(function(e) {
            e.pause();
            e.src = '';
            e.muted = false;
        });

        // stop and clear all videos
        vpad.find('video').each(function(k, e){
            $(e).hide();
            e.pause();
            e.src = ''
            e.muted = false;
        });

        // remove queued request
        reqpool.pop();

        // recycle buttons
        btnaccept.appendTo(drawer);
        btnreject.appendTo(drawer);
        btncancel.appendTo(drawer);
        btnmute.appendTo(drawer);
        btnend.appendTo(drawer);

        // restore mute button default
        btnmute.removeClass('btn-success').addClass('btn-warning').html('mute');

        // recycle video element
        localview[0].src = '';
        fullview[0].src = '';        
        vpad.appendTo(drawer);

        // show default buttons and hidden peers
        $('.panel-success').find('button').show();
        $('.panel-success').show();
        cparty.children('span').html(cparty.children('span').html().split(' (')[0]);
        $('.panel-body').hide();

        // disable conference button
        $('#host').find('.btn-success').attr('disabled', false);

        // in case there is a addMedia retry task, clear it out
        clearTimeout(retrymedia);

        // reset state
        cstate = 'idle';

        // reload ring/ringback tones
        ring.load();
        ringback.load();
    }

    // dynamically insert media element to web page based on call type
    function addmedia(ls, rs) {
        var lstream = pc.medchans[creq.id].lstream;
        var rstream = pc.medchans[creq.id].rstream;

        // make sure steams are ready or wait and retry
        if (lstream && rstream) {
            // console.log(lstream.getTracks().length
            //     rstream.getTracks().length)
            if (pc.medchans[creq.id].type == 'video') {
                cparty.parent().find('.panel-body').append(vpad);
                $('.panel-body').show();
                fullview.show();
                fullview[0].src = URL.createObjectURL(rstream);

                localview.show();
                localview[0].muted = true;
                localview[0].src = URL.createObjectURL(lstream);
            }
            else {
                au[1].src = URL.createObjectURL(rstream);
                au[1].play();

                au[0].src = URL.createObjectURL(lstream);
                au[0].muted = true;
                au[0].play();
            }
        }
        else { retrymedia = setTimeout(function(){ addmedia() }, 100); }
    }

    // this function is reserved for mobile browser which requires user interaction to trigger audio play
    function svcStart() {
        ring.play();
        ring.pause();
        ringback.play();
        ringback.pause();

        pc.start();
    }

    function setCookie(key, value) {
        var expires = new Date();
        expires.setTime(expires.getTime() + (180 * 24 * 60 * 60 * 1000));
        document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
    }

    function getCookie(key) {
        var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
        return keyValue ? keyValue[2] : null;
    }
})();
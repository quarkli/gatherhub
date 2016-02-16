/*
gatherhub.js is distributed under the permissive MIT License:

Copyright (c) 2015, Quark Li, quarkli@gmail.com
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

Author: quarkli@gmail.com
*/

'use strict';

// Module Namespace：Gatherhub, all functions
// object prototypes will be under Gatherhub.xxx
var Gatherhub = Gatherhub || {};

(function() {
    // Browser Naming Converter
    var RPC = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia).bind(navigator);
    var warn = (console.error).bind(console);

    var hint = {
        fpeer: 'Warning: PeerCom.peer must be String >',
        fhub: 'Warning: PeerCom.hub must be String >',
        fcb: 'Warning: Callback must be Function >',
        send: 'Warning: Message cannot be sent >',
        start: 'Warning: PeerCom is not started >',
        peer: 'Warning: Peer does not exist >'
    };

    // Abbreviation
    var g = Gatherhub;

    // Module based public object: PeerCom, WebRTC Peer-to-Peer Communicator
    (function() {
        // Object-base shared local variables and functions

        // Export object Prototype to public namespace
        g.PeerCom = PeerCom;

        // Object Constructor
        function PeerCom(config) {
            // Object self-reference
            var pc = this;

            // Private variables
            var _wcc = null;

            // Properties declaration
            var id, peer, hub, servers, iceservers, peers, medchans, state;
            var onerror, onpeerchange, onmessage, onmediarequest, onstatechange;
            // Properties / Event Callbacks/ Methods declaration
            (function() {
                // tyep check: string
                Object.defineProperty(pc, 'peer', {
                    get: function() { return peer; },
                    set: function(x) {
                        if (typeof(x) == 'string') {
                            peer = x;
                            if (state == 'started') {
                                stop();
                                start();
                            }
                        }
                        else { warn(hint.fpeer, 'PeerCom.peer'); }
                        return peer;
                    }
                });
                // type check: string
                Object.defineProperty(pc, 'hub', {
                    get: function() { return hub; },
                    set: function(x) {
                        if (typeof(x) == 'string') {
                            hub = x;
                            if (state == 'started') {
                                stop();
                                start();
                            }
                        }
                        else { warn(hint.fhub, 'PeerCom.hub'); }
                        return hub;
                    }
                });
                // type check: array
                Object.defineProperty(pc, 'servers', {
                    get: function() { return servers; },
                    set: function(x) {
                        if (x) {
                            servers = x;
                            if (state == 'started') {
                                stop();
                                start();
                            }
                        }
                        return servers;
                    }
                });
                // type check: object
                Object.defineProperty(pc, 'iceservers', {
                    get: function() { return iceservers; },
                    set: function(x) {
                        if (x) { iceservers = x; }
                        return iceservers;
                    }
                });

                // read-only properties
                Object.defineProperty(pc, 'id', {get: function() { return id; }});
                Object.defineProperty(pc, 'peers', {get: function() { return peers; }});
                Object.defineProperty(pc, 'medchans', {get: function() { return medchans; }});
                Object.defineProperty(pc, 'state', {get: function() { return state; }});

                // Callbacks declaration, type check: function
                Object.defineProperty(pc, 'onerror', {
                    get: function() { return onerror; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onerror = x; }
                        else { warn(hint.fcb, 'onerror'); }
                    }
                });
                Object.defineProperty(pc, 'onpeerchange', {
                    get: function() { return onpeerchange; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onpeerchange = x; }
                        else { warn(hint.fcb, 'onpeerchange'); }
                    }
                });
                Object.defineProperty(pc, 'onmessage', {
                    get: function() { return onmessage; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onmessage = x; }
                        else { warn(hint.fcb, 'onmessage'); }
                    }
                });
                Object.defineProperty(pc, 'onmediarequest', {
                    get: function() { return onmediarequest; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onmediarequest = x; }
                        else { warn(hint.fcb, 'onmediarequest'); }
                    }
                });
                Object.defineProperty(pc, 'onstatechange', {
                    get: function() { return onstatechange; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onstatechange = x; }
                        else { warn(hint.fcb, 'onstatechange'); }
                    }
                });

                // Methods declaration, read-only
                Object.defineProperty(pc, 'start', { value: start });
                Object.defineProperty(pc, 'stop', { value: stop });
                Object.defineProperty(pc, 'send', { value: send });
                Object.defineProperty(pc, 'mediaRequest', { value: mediaRequest });
                Object.defineProperty(pc, 'mediaResponse', { value: mediaResponse });
            })();

            // Methods implementation
            function start() {
                if (!(RPC && RTCSessionDescription && RTCIceCandidate && getUserMedia)) {
                    setTimeout(function() {
                        if (pc.onerror) { pc.onerror({code: -1, reason: 'Browser does not support WebRTC'}); }
                    }, 0);
                    return;
                }

                _changeState('starting');

                // Create WCC Object and Initiate Registration Event
                _wcc = new _WCC({peer: peer, hub: hub, servers: servers});

                // Add Signal Handling
                _wcc.onerror = function(e) {
                    if (pc.onerror) {
                        setTimeout(function() {
                            pc.onerror({code: -2, reason: 'Critical! WebSocket creation failed!', src: e});
                        }, 0);
                    }
                };

                _wcc.onmessage = function(msg) {
                    switch (msg.type) {
                        case 'hi':
                            // if peer existed in peers, remove and replace
                            if (peers[msg.from]) { _removePeer(msg.from); }
                            _addPeer(msg.from, msg.data.peer);
                            peers[msg.from].sigchan.open();
                            break;
                        case 'bye':
                            if (peers[msg.from]) { _removePeer(msg.from); }
                            break;
                        case 'sdp':
                            if (peers[msg.from] === undefined) { _addPeer(msg.from, msg.data.peer); }
                            peers[msg.from].sigchan.open(msg.data);
                            break;
                        case 'media':
                            if (pc.onmediarequest) { setTimeout(function() { pc.onmediarequest(msg.data); }, 0); }
                            if (medchans[msg.data.id]) {
                                medchans[msg.data.id].negotiate(msg.data);
                            }
                            break;
                        default:
                            if (pc.onmessage) { setTimeout(function() { pc.onmessage(msg); }, 0); }
                            break;
                    }
                };

                _wcc.onstatechange = function(state) {
                    if (state == 'registered') {
                        id = _wcc.id;
                        _changeState('started');
                    }
                    else { _changeState(state); }
                };
            }

            function stop() {
                _changeState('stopping');

                // Notify peers of disconnection
                _wcc.send({}, 'bye');

                // Clear Peers
                for (var i in peers) { _removePeer(i); }

                // Initiate Deregistration Event and Destroy WCC Object
                _wcc = null;

                _changeState('stopped');
            }

            function send(data, type, to) {
                var ret = true;
                if (state == 'started') {
                    if (Object.keys(peers).length) {
                        if (to) {
                            if (peers[to] && peers[to].sigchan.state == 'open') { ret = peers[to].sigchan.send(data, type); }
                            else { ret = _wcc.send(data, type, to); }
                        }
                        else {
                            for (var to in peers) {
                                if (peers[to].sigchan.state == 'open') { ret = ret && peers[to].sigchan.send(data, type); }
                                else { ret = _wcc.send(data, type, to); }
                            }
                        }
                    }
                    else if (_wcc) {
                        ret = _wcc.send(data, type, to);
                    }
                    else {
                        warn(hint.send, 'PeerCom.send()');
                        ret = false;
                    }

                    return ret;
                }

                warn(hint.start, 'PeerCom.send()');
                return false;
            }

            function mediaRequest(req) {
                var wmc = null;

                if (state != 'started') {
                    warn(hint.start, 'PeerCom.mediaRequest()');
                    return false;
                }

                if (peers[req.to]) {
                    req.from = id;
                    var wmc = new _WMC(req, pc.send, iceservers);
                    wmc.onstatechange = function(s) {
                        console.log('medchans[' + wmc.id + '].state:', s);
                        if (s == 'closed') {
                            delete medchans[wmc.id];
                            wmc = null;
                        }
                    };

                    medchans[wmc.id] = wmc;
                    return wmc.id;
                }
                else {
                    warn(hint.peer, 'PeerCom.mediaRequest()');
                }

                return 0;
            }

            function mediaResponse(req, answer) {
                var wmc = null;

                if (state != 'started') {
                    warn(hint.start, 'PeerCom.mediaResponse()');
                    return false;
                }

                if (peers[req.from] && req.id && req.mdesc && req.type == 'offer') {
                    if (answer == 'accept') {
                        var tmp = req.to;
                        req.to = req.from;
                        req.from = tmp;
                        var wmc = new _WMC(req, pc.send, iceservers);
                        wmc.onstatechange = function(s) {
                            console.log('medchans[' + wmc.id + '].state:', s);
                            if (s == 'closed') {
                                delete medchans[wmc.id];
                                wmc = null;
                            }
                        };

                        medchans[wmc.id] = wmc;
                        return wmc.id;
                    }
                    else if (answer == 'reject') {
                        req.type = 'reject';
                        pc.send(req, 'media', req.from);
                    }
                }
                else {
                    warn(hint.peer, 'PeerCom.mediaResponse()');
                }

                return 0;
            }

            // Private functions
            function _addPeer(pid, pname) {
                if (!peers[pid]) {
                    var p = {peer: pname, sigchan: new _WPC(pid, _wcc, iceservers)};
                    p.sigchan.onmessage = function(msg) {
                        if (msg.type == 'media') {
                            if (pc.onmediarequest) { setTimeout(function() { pc.onmediarequest(msg.data); }, 0); }
                            if (medchans[msg.data.id]) {
                                medchans[msg.data.id].negotiate(msg.data);
                            }
                        }
                        else if (pc.onmessage) { setTimeout(function() { pc.onmessage(msg); }, 0); }
                    };
                    p.sigchan.onstatechange = function(s) {
                        if (s == 'close') { _removePeer(pid); }
                    };
                    peers[pid] = p;
                    if (pc.onpeerchange) {
                        setTimeout(function() { pc.onpeerchange(peers); }, 0);
                    }
                }
            }

            function _removePeer(pid) {
                if (peers[pid]) {
                    peers[pid].sigchan.close();
                    delete peers[pid];
                    if (pc.onpeerchange) {
                        setTimeout(function() { pc.onpeerchange(peers); }, 0);
                    }
                }
            }

            function _changeState(ste) {
                state = ste;
                if (pc.onstatechange) {
                    setTimeout(function() { pc.onstatechange(state); }, 0);
                }
            }

            // Main process
            id = '';
            peer = '';
            hub = '';
            servers = [];
            iceservers = [];
            peers = {};
            medchans = {};
            _changeState('stopped');

            // do not start if any of WebRTC API is not available
            if (RPC && RTCSessionDescription && RTCIceCandidate && getUserMedia) {
                if (config) {
                    pc.peer = config.peer;
                    pc.hub = config.hub;
                    pc.servers = config.servers;
                    pc.iceservers = config.iceservers;
                    start();
                }
            }
            else {
                setTimeout(function() {
                    if (pc.onerror) { pc.onerror({code: -1, reason: 'Browser does not support WebRTC'}); }
                }, 100);
            }
        }
    })();

    // Module based internal object: _WMC, WebRTC Media Channel
    var _WMC;
    (function() {
        // Object-base shared local variables and functions

        // Export object Prototype to public namespace
        _WMC = WMC;

        // Object Constructor
        function WMC(req, sigchan, iceservers) {
            var wmc = this;

            var _pc = new RPC({iceServers: (iceservers || null)});
            var _res = {};

            _pc.onicecandidate = function(e) {
                if (e.candidate) { conn.push(e.candidate); }
            };
            _pc.onaddstream = function(e) { rstream = e.stream; };

            // not used yet, just log the event for now
            _pc.onremovestream = function(e) { console.log(e); };

            var id, to, from, mdesc, sdp, conn, lstream, rstream, muted, type, state;
            var onstatechange;
            (function() {
                // read-only properties
                Object.defineProperty(wmc, 'id', {get: function() { return id; }});
                Object.defineProperty(wmc, 'to', {get: function() { return to; }});
                Object.defineProperty(wmc, 'from', {get: function() { return from; }});
                Object.defineProperty(wmc, 'mdesc', {get: function() { return mdesc; }});
                Object.defineProperty(wmc, 'sdp', {get: function() { return sdp; }});
                Object.defineProperty(wmc, 'conn', {get: function() { return conn; }});
                Object.defineProperty(wmc, 'lstream', {get: function() { return lstream; }});
                Object.defineProperty(wmc, 'rstream', {get: function() { return rstream; }});
                Object.defineProperty(wmc, 'muted', {get: function() { return muted; }});
                Object.defineProperty(wmc, 'type', {get: function() { return type; }});
                Object.defineProperty(wmc, 'state', {get: function() { return state; }});

                // Callbacks declaration, type check: function
                Object.defineProperty(wmc, 'onstatechange', {
                    get: function() { return onstatechange; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onstatechange = x; }
                        else { warn(hint.fcb, 'onstatechange'); }
                    }
                });

                 // Methods declaration, read-only
                Object.defineProperty(wmc, 'negotiate', { value: negotiate });
                Object.defineProperty(wmc, 'cancel', { value: cancel });
                Object.defineProperty(wmc, 'update', { value: update });
                Object.defineProperty(wmc, 'end', { value: end });
                Object.defineProperty(wmc, 'mute', { value: mute });
            })();

            function negotiate(req) {
                if (req.type == 'answer') {
                    from = _res.from = req.from;
                    _pc.setRemoteDescription(new RTCSessionDescription(req.sdp));
                    req.conn.forEach(function(e) { _pc.addIceCandidate(new RTCIceCandidate(e)); });
                    _changeState('opened');
                }
                else if (req.type == 'cancel') {
                    _changeState('canceled');
                    setTimeout(_closechan, 1000);
                }
                else if (req.type == 'end') {
                    _changeState('ended');
                    setTimeout(_closechan, 1000)
                }
                if (req.type == 'reject') {
                    _changeState('rejected');
                    setTimeout(_closechan, 1000);
                }
            }

            function cancel() {
                if (state == 'requesting') {
                    _res.type = 'cancel';
                    sigchan(_res, 'media', to);
                    _changeState('canceled');
                    setTimeout(_closechan, 1000);
                    return true;
                }
                return false;
            }

            function end() {
                _res.type = 'end';
                sigchan(_res, 'media', to);
                _changeState('ended');
                setTimeout(_closechan, 1000);
                return true;
            }

            function update(req) {
            }

            function mute() {
                var aud = lstream.getTracks().find(
                    function(e) {
                        return e.kind == 'audio';
                    }
                );

                if (aud) {
                    aud.enabled = muted;
                    muted = !muted;
                }
            }

            // Private functions
            function _makereq() {
                _changeState('requesting');

                getUserMedia(
                    mdesc,
                    function(s) {
                        lstream = s;
                        // this does not work for firefox when request for video
                        // need a workaround if firefox needs to be supported
                        _pc.addStream(s);
                        _pc.createOffer(
                            function(sdp) {
                                _res.sdp = sdp;
                                _negotiation(sdp);
                            },
                            function(e) { console.error("Signal error: " + e.name); }
                        );
                    },
                    function(e) {
                        _changeState('failed');
                    }
                );
            }

            function _makeres() {
                getUserMedia(
                    mdesc,
                    function(s) {
                        lstream = s;
                        // this does not work for firefox when request for video
                        // need a workaround if firefox needs to be supported
                        _pc.addStream(s);
                        _pc.createAnswer(
                            function(sdp){
                                _res.sdp = sdp;
                                _negotiation(sdp);
                            },
                            function(e) { console.error("Signal error: " + e.name);}
                        );
                    },
                    function(e) {
                        _changeState('failed');
                    }
                );
            }

            function _negotiation(sdp) {
                _pc.setLocalDescription(sdp);

                var c = 0;
                var wait = 3;
                var disp = setInterval(function() {
                    if (c == conn.length) { wait--; }
                    else {
                        c = conn.length;
                        wait = 3;
                    }
                    if (!wait) {
                        sigchan(_res, 'media', to);
                        clearInterval(disp);
                    }
                }, 35);
            }

            function _closechan() {
                if (lstream) {
                    lstream.getTracks().forEach(
                        function(e) { e.stop(); }
                    );
                    lstream = null;
                }
                if (rstream) {
                    rstream.getTracks().forEach(
                        function(e) { e.stop(); }
                    );
                    rstream = null;
                }
                _pc.close();
                _pc = null;
                _changeState('closed');
            }

            function _timeout() {
                _changeState('timeout');
                if (state == 'requesting') {
                    setTimeout(cancel, 1000);
                }
                else {
                    setTimeout(_closechan, 1000);
                }
            }

            function _changeState(ste) {
                state = ste;
                if (wmc.onstatechange) { setTimeout(function() { wmc.onstatechange(state); }, 0); }
            }

            function _init() {
                id = _res.id = req.id || (parseInt(req.to, 16) + Date.now()).toString(16);
                to = _res.to = req.to || '';
                from = _res.from = req.from || '';
                mdesc = _res.mdesc = req.mdesc || {};
                sdp = _res.sdp = req.sdp || null;
                conn = _res.conn = req.conn || [];
                muted = false;
                type = mdesc.video ? 'video' : 'audio';

                _changeState('initialized');

                if (req.id) {
                    if (req.type == 'offer') {
                        _pc.setRemoteDescription(new RTCSessionDescription(req.sdp));
                        req.conn.forEach(function(e) { _pc.addIceCandidate(new RTCIceCandidate(e)); });
                        _res.type = 'answer';
                        _makeres(sdp);
                        _changeState('opened');
                    }
                }
                else {
                    req.id = _res.id;
                    _res.type = 'offer';
                    _makereq();
                }
                // Prepare a timeout method when request cannot be completed
                // setTimeout(
                //     function() {
                //         if (state != 'opened') { _timeout(); }
                //     },
                //     30000
                // );
            }

            _init();
        }
     })();

    // Module based internal object: _WPC, WebRTC PeerConnection Channel
    var _WPC;
    (function() {
        // Object-base shared local variables and functions

        // Export object Prototype to public namespace
        _WPC = WPC;

        // Object Constructor
        function WPC(id, sigchan, iceservers) {
            // Object sefl-reference
            var wpc = this;

            // Private variables
            var _pc = new RPC({iceServers: (iceservers || null)});
            var _sc = sigchan || null;
            var _dc = null;
            var _conn = [];

            // collect ICE candidates information
            _pc.onicecandidate = function(e) {
                if (e.candidate) { _conn.push(e.candidate); }
            };
            // Assign datachannel object to _dc after received remote offer
            _pc.ondatachannel = function(e){
                if (e.channel) {
                    _dc = e.channel;
                    _dcsetup();
                }
            };
            // Send datachannel negotiation infomration through WCC based on signaling state
            _pc.onsignalingstatechange = function(e) {
                if (_pc.signalingState == 'have-remote-offer') {
                    _pc.createAnswer(
                        function(sdp){ _negotiation(sdp); },
                        function(e) { console.error("Signal error: " + e.name);}
                    );
                }
            };

            var state = 'close';
            var onerror, onmessage, onstatechange;
            // Properties / Event Callbacks/ Methods declaration
            (function() {
                // read-only property
                Object.defineProperty(wpc, 'state', {get: function() { return state; }});

                // Callbacks declaration, type check: function
                Object.defineProperty(wpc, 'onerror', {
                    get: function() { return onerror; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onerror = x; }
                        else { warn(hint.fcb, 'onerror'); }
                    }
                });
                Object.defineProperty(wpc, 'onmessage', {
                    get: function() { return onmessage; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onmessage = x; }
                        else { warn(hint.fcb, 'onmessage'); }
                    }
                });
                Object.defineProperty(wpc, 'onstatechange', {
                    get: function() { return onstatechange; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onstatechange = x; }
                        else { warn(hint.fcb, 'onstatechange'); }
                    }
                });

                 // Methods declaration, read-only
                Object.defineProperty(wpc, 'open', { value: open });
                Object.defineProperty(wpc, 'close', { value: close });
                Object.defineProperty(wpc, 'send', { value: send });
            })();

            // Methods implementation
            function open(offer) {
                if (offer) {
                    if (offer.sdp) {
                        _pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
                    }

                    if (offer.conn) {
                        offer.conn.forEach(
                            function(e) { _pc.addIceCandidate(new RTCIceCandidate(e)); }
                        );
                    }
                }
                else {
                    if (_dc == null) {
                        _dc = _pc.createDataChannel(id);
                        _dcsetup();
                    }

                    _pc.createOffer(
                        function(sdp) { _negotiation(sdp); },
                        function(e) { console.error("Signal error: " + e.name); }
                    );
                }
            }

            function close() {
                if (_dc) _dc.close();
                _pc.close();
            }

            function send(data, type) {
                if (_dc.readyState == 'open') {
                    _dc.send(JSON.stringify({data: data, type: type, from: _sc.id, via: 'wpc', ts: _sc.getTs()}));
                    return true;
                }
                return false;
            }

            // Private functions
            function _changeState(ste) {
                state = ste;
                if (wpc.onstatechange) { setTimeout(function() { wpc.onstatechange(state); }, 0); }
            }

            function _negotiation(sdp) {
                _pc.setLocalDescription(sdp);

                var c = 0;
                var wait = 3;
                var disp = setInterval(function() {
                    if (c == _conn.length) { wait--; }
                    else {
                        c = _conn.length;
                        wait = 3;
                    }
                    if (!wait) {
                        _sc.send({'sdp': _pc.localDescription, conn: _conn}, 'sdp', id);
                        clearInterval(disp);
                    }
                }, 35);
            }

            function _dcsetup() {
                _dc.onmessage = function(e){
                    if (wpc.onmessage) {
                        var msg = JSON.parse(e.data);
                        switch (msg.type) {
                            case 'ping':
                                msg.from = _sc.id;
                                msg.type = 'pong';
                                _dc.send(JSON.stringify(msg));
                                break;
                            case 'pong':
                                msg.data = {};
                                msg.data.delay = Date.now() - msg.ts;
                                // no break here to continue onmessage invoke for ping response
                            default:
                                setTimeout(function() { wpc.onmessage(msg); }, 0);
                                break;
                        }
                    }
                };
                _dc.onopen = _dc.onclose = function(e) { _changeState(_dc.readyState); };
            }
        }
    })();

    // Module based internal object: _WCC, WebSocket Communication Channel
    var _WCC;
    (function() {
        // Object-base shared local variables and functions

        // Export object Prototype to public namespace
        _WCC = WCC;

        // Object Constructor
        function WCC(config) {
            // Object self-reference
            var wcc = this;

            // private variables
            var _ws = null;
            var _svrIdx = -1;
            var _tsDiff = 0;
            var _beaconDur = 25000; // 25 seconds
            var _beaconTask = -1;
            var _peer, _hub, _servers;

            // Properties / Event Callbacks / Methods declaration
            var id, state;
            var onerror, onmessage, onstatechange;
            (function() {
                // read-only properties
                Object.defineProperty(wcc, 'id', {get: function() { return id; }});
                Object.defineProperty(wcc, 'state', {get: function() { return state; }});

                // Callbacks declaration, type check: function
                Object.defineProperty(wcc, 'onerror', {
                    get: function() { return onerror; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onerror = x; }
                        else { warn(hint.fcb, 'onerror'); }
                    }
                });
                Object.defineProperty(wcc, 'onmessage', {
                    get: function() { return onmessage; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onmessage = x; }
                        else { warn(hint.fcb, 'onmessage'); }
                    }
                });
                Object.defineProperty(wcc, 'onstatechange', {
                    get: function() { return onstatechange; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onstatechange = x; }
                        else { warn(hint.fcb, 'onstatechange'); }
                    }
                });

                 // Methods declaration, read-only
                Object.defineProperty(wcc, 'send', { value: send });
                Object.defineProperty(wcc, 'getTs', { value: getTs });
            })();

            // Methods implementation
            function send(data, type, to) {
                if (state == 'connected' || state == 'registered') {
                    if (data instanceof Object && !(data instanceof Array) && !(data instanceof Function)) {
                        data.peer = _peer;
                    }
                    var msg = {hub: _hub, from: id, data: data, via: 'wcc'};
                    if (to) msg.to = to;
                    if (type) msg.type = type;
                    msg.ts = getTs();
                    _ws.send(JSON.stringify(msg));

                    return true;
                }
                return false;
            }

            function getTs() { return _tsDiff ? Date.now() - _tsDiff : 0; }

            // Private functions
            function _changeState(ste) {
                state = ste;
                if (wcc.onstatechange) {
                    setTimeout(function() { wcc.onstatechange(state); }, 0);
                }
            }

            function _connect() {
                _peer = config.peer || 'unknown';
                _hub = config.hub || 'unknown';
                _servers = config.servers || ['wss://localhost'];
                _svrIdx = (_svrIdx + 1) % _servers.length;
                _ws = new WebSocket(_servers[_svrIdx]);
                _changeState('connecting');

                _ws.onerror = function(e) {};
                _ws.onopen = function() {
                    _changeState('connected');
                    send({}, 'hi');
                };
                _ws.onmessage = function(msg) {
                    var ctx = JSON.parse(msg.data);

                    // Some control messaages/logics will be handled here without passing to upper application
                    switch (ctx.type) {
                        case 'ho':
                            // special reply from server for completing peer registration
                            if (ctx.data.result && ctx.data.result == 'Success') {
                                _tsDiff = Date.now() - ctx.ts;
                                id = ctx.from
                                _changeState('registered');
                                _beaconTask = setInterval(function() { send({}, 'beacon', id); }, _beaconDur);
                            }
                            break;
                        case 'ping':
                            ctx.from = id;
                            ctx.type = 'pong';
                            _ws.send(JSON.stringify(ctx));
                            break;
                        case 'pong':
                            ctx.data = {};
                            ctx.data.delay = Date.now() - ctx.ts;
                            // no break here to continue onmessage invoke for ping response
                        default:
                            if (wcc.onmessage) {
                                setTimeout(function() { wcc.onmessage(ctx); }, 0);
                            }
                            break;
                    }
                };
                _ws.onclose = function(e) {
                    console.log('WCC Closed: (', e.code, ')');
                    _changeState('disconnected');
                    clearInterval(_beaconTask);
                    _ws = null;
                    setTimeout(function() { _connect(); }, 0);
                };
            }

            // Main process
            _connect();
        }
    })();
})();
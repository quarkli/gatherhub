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
    // Abbreviation
    var g = Gatherhub;

    // Module based public object: PeerCom, WebRTC Peer-to-Peer Communicator
    (function() {
        // Object-base shared local variables and functions

        // Export object Prototype to public namespace
        g.PeerCom = PeerCom;

        // Object Constructor
        function PeerCom(config) {
            var pc = this;
            var _wcc = null;

            // Properties declaration
            var id, hub, servers, iceservers, state, peers;
            // tyep check: string
            Object.defineProperty(pc, 'id', {
                get: function() { return id; },
                set: function(x) {
                    if (typeof(x) == 'string') { id = x; }
                    else { console.error('PeerCom.id must be String'); }
                    return id;
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
                    else { console.error('PeerCom.hub must be String'); }
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
            // read-only property
            Object.defineProperty(pc, 'peers', {
                get: function() { return peers; },
                set: function() { return; }
            });
            // read-only property
            Object.defineProperty(pc, 'state', {
                get: function() { return state; },
                set: function() { return; }
            });

            // Callbacks declaration, type check: function
            var onerror, onpeerchange, onmessage, onmediarequest, onmediaresponse, onstatechange;
            Object.defineProperty(pc, 'onerror', {
                get: function() { return onerror; },
                set: function(x) {
                    if (typeof(x) == 'function') { onerror = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(pc, 'onpeerchange', {
                get: function() { return onpeerchange; },
                set: function(x) {
                    if (typeof(x) == 'function') { onpeerchange = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(pc, 'onmessage', {
                get: function() { return onmessage; },
                set: function(x) {
                    if (typeof(x) == 'function') { onmessage = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(pc, 'onmediarequest', {
                get: function() { return onmediarequest; },
                set: function(x) {
                    if (typeof(x) == 'function') { onmediarequest = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(pc, 'onmediaresponse', {
                get: function() { return onmediaresponse; },
                set: function(x) {
                    if (typeof(x) == 'function') { onmediaresponse = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(pc, 'onstatechange', {
                get: function() { return onstatechange; },
                set: function(x) {
                    if (typeof(x) == 'function') { onstatechange = x; }
                    else { console.error('Callback must be Function'); }
                }
            });

            // Methods declaration, read-only
            Object.defineProperty(pc, 'start', { value: start });
            Object.defineProperty(pc, 'stop', { value: stop });
            Object.defineProperty(pc, 'send', { value: send });
            Object.defineProperty(pc, 'mediaRequest', { value: mediaRequest });
            Object.defineProperty(pc, 'mediaResponse', { value: mediaResponse });
            Object.defineProperty(pc, 'mediaCtrl', { value: mediaCtrl });

            // Functions
            function addPeer(p) {
                if (peers[p] === undefined) {
                    var peer = {name: p.name, wpc: new _WPC({peer: p.id, severs: config.iceservers, sigchan: _wcc})};
                    peer.wpc.onmessage = function(msg) {
                        if (pc.onmessage) { setTimeout(function() { pc.onmessage(msg); }, 0); }
                    };
                    peers[p.id] = peer;
                    if (pc.onpeerchange) {
                        setTimeout(function() { pc.onpeerchange(peers); }, 0);
                    }
                }
            }

            function removePeer(p) {
                if (peers[p]) {
                    peers[p].wpc.closeChan();
                    delete peers[p];
                    if (pc.onpeerchange) {
                        setTimeout(function() { pc.onpeerchange(peers); }, 0);
                    }
                }
            }

            function changeState(ste) {
                state = ste;
                if (pc.onstatechange) {
                    setTimeout(function() { pc.onstatechange(state); }, 0);
                }
            }

            function start() {
                changeState('starting');

                // Create WCC Object and Initiate Registration Event
                _wcc = new _WCC({id: id, hub: hub, servers: servers});

                // Add Signal Handling
                _wcc.onerror = function(e) {
                    // other error, raise parent error
                    if (pc.onerror) {
                        setTimeout(function() { pc.onerror(e); }, 0);
                    }
                    // stop();
                };

                _wcc.onmessage = function(msg) {
                    switch (msg.type) {
                        case 'hi':
                            if (peers[msg.from]) { removePeer(msg.from); }
                            addPeer({id: msg.from, name: msg.data.name});
                            if (peers[msg.from]) { peers[msg.from].wpc.openChan(); }
                            break;
                        case 'bye':
                            if (peers[msg.from]) { removePeer(msg.from); }
                            break;
                        case 'sdp':
                        case 'conn':
                            if (peers[msg.from] === undefined) { addPeer({id: msg.from, name: msg.data.name}); }
                            if (peers[msg.from]) { peers[msg.from].wpc.openChan(msg.data); }
                            break;
                        default:
                            if (pc.onmessage) {
                                setTimeout(function() { pc.onmessage(msg); }, 0);
                            }
                            break;
                    }
                };

                _wcc.onstatechange = function(state) {
                    if (state == 'registered') { changeState('started'); }
                    else { changeState(state); }
                };
            }

            function stop() {
                changeState('stopping');
                // Notify peers of disconnection
                send({}, 'bye');

                // Clear Peers
                for (var i in peers) {
                    removePeer(i);
                }

                // Initiate Deregistration Event and Destroy WCC Object
                _wcc.send({}, 'bye');
                _wcc = null;

                changeState('stopped');
            }

            function send(data, type, to) {
                if (state == 'started') {
                    if (Object.keys(peers).length) {
                        if (to) {
                            if (peers[to]) { peers[to].wpc.send(data, type); }
                            else { _wcc.send(data, type, to); }
                        }
                        else {
                            for (var i in peers) {
                                peers[i].wpc.send(data, type);
                            }
                        }
                    }
                    else if (_wcc) {
                        _wcc.send(data, type, to);
                    }
                    else {
                        console.error('message cannot be sent');
                        return false;
                    }
                    return true;
                }

                console.error('PeerCom not started')
                return false;
            }

            function mediaRequest(req) {
                // body...
            }

            function mediaResponse(rep) {
                // body...
            }

            function mediaCtrl(arg) {
                // body...
            }

            // Main process
            peers = {};
            changeState('stopped');

            if (config) {
                id = config.id || 'p' + (0 | Math.random() * 100000);
                hub = '' + (config.hub || 1000);
                servers = config.servers || ['ws://minichat.gatherhub.com:55555', 'ws://192.168.11.123:55555'];
                iceservers = config.iceservers || null;
                start();
            }
        }
    })();

    // Module based public functions

    // Module based internal functions
    function extend(func) {
        var base = function() {};
        base.prototype = func.prototype;
        return new base();
    }

    // Module based internal object: _WPC, WebRTC PeerConnection Channel
    var _WPC;
    (function() {
        // Object-base shared local variables and functions

        // Export object Prototype to public namespace
        _WPC = WPC;

        // Object Constructor
        function WPC(config) {
            var RPC = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
            var _pc = new RPC({iceservers: _servers});
            var _sc = config.sigchan || null;
            var _peer = config.peer || '';
            var _servers = config.servers || null;
            var _dc = null;
            var wpc = this;

            _pc.onicecandidate = function(e) {
                if (e.candidate) { _sc.send({conn: e.candidate}, 'conn', _peer); }   
            };
            _pc.ondatachannel = function(e){
                if (e.channel) {
                    e.channel.onmessage = function(e){
                        if (wpc.onmessage) { setTimeout(function() { wpc.onmessage(JSON.parse(e.data)); }, 0); }
                    };
                }
            }; 

            // Callbacks declaration, type check: function
            var onerror, onmessage, onstatechange;

            Object.defineProperty(wpc, 'onerror', {
                get: function() { return onerror; },
                set: function(x) {
                    if (typeof(x) == 'function') { onerror = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(wpc, 'onmessage', {
                get: function() { return onmessage; },
                set: function(x) {
                    if (typeof(x) == 'function') { onmessage = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(wpc, 'onstatechange', {
                get: function() { return onstatechange; },
                set: function(x) {
                    if (typeof(x) == 'function') { onstatechange = x; }
                    else { console.error('Callback must be Function'); }
                }
            });

             // Methods declaration, read-only
            Object.defineProperty(wpc, 'openChan', { value: openChan });
            Object.defineProperty(wpc, 'closeChan', { value: closeChan });
            Object.defineProperty(wpc, 'send', { value: send });

            function openChan(sdp) {
                if (sdp) {
                    if (_dc == null) {
                        _dc = _pc.createDataChannel(_peer);
                        //_dc.onopen = _dc.onclose = function(e) { console.log(_dc.readyState); };
                    }

                    if (sdp.sdp) {
                        _pc.setRemoteDescription(new RTCSessionDescription(sdp.sdp));
                        if (sdp.sdp.type == 'offer') {
                            _pc.createAnswer(function(sdp){
                                _pc.setLocalDescription(sdp);
                                _sc.send({'sdp': sdp}, 'sdp', _peer);
                            }, 
                            function (err) { console.log("Signal error: " + err.name); });
                        }
                    }

                    if (sdp.conn) {
                        _pc.addIceCandidate(new RTCIceCandidate(sdp.conn));
                    }
                }
                else {
                    if (_dc == null) {
                        _dc = _pc.createDataChannel(_peer);
                        //_dc.onopen = _dc.onclose = function(e) { console.log(_dc.readyState); };
                    }

                    _pc.createOffer(function(sdp) {
                        _pc.setLocalDescription(sdp);
                        _sc.send({'sdp': sdp}, 'sdp', _peer);
                    }, 
                    function signalError(err) { console.log("Signal error: " + err.name); });                    
                }
            }

            function closeChan() {
                _dc.close();
                _pc.close();
            }

            function send(data, type) {
                console.log(_dc.readyState);
                _dc.send(JSON.stringify({data: data, type: type, from: _sc.id, ts: _sc.getTs()}));
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
            var wcc = this;
            var _ws = null;
            var _svrIdx = -1;
            var _tsDiff = 0;
            var _pingTime = 25000;
            var _pingTask = -1;

            // Properties declaration
            var id, hub, servers, state;

            // tyep check: string
            Object.defineProperty(wcc, 'id', {
                get: function() { return id; },
                set: function(x) {
                    if (typeof(x) == 'string') { id = x; }
                    else { console.error('PeerCom.id must be String'); }
                    return id;
                }
            });
            // type check: string
            Object.defineProperty(wcc, 'hub', {
                get: function() { return hub; },
                set: function(x) {
                    if (typeof(x) == 'string') {
                        hub = x;
                        if (state == 'started') {
                            stop();
                            start();
                        }
                    }
                    else { console.error('PeerCom.hub must be String'); }
                    return hub;
                }
            });
            // type check: array
            Object.defineProperty(wcc, 'servers', {
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
            // read-only property
            Object.defineProperty(wcc, 'state', {
                get: function() { return state; },
                set: function() { return; }
            });

            // Callbacks declaration, type check: function
            var onerror, onmessage, onstatechange;

            Object.defineProperty(wcc, 'onerror', {
                get: function() { return onerror; },
                set: function(x) {
                    if (typeof(x) == 'function') { onerror = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(wcc, 'onmessage', {
                get: function() { return onmessage; },
                set: function(x) {
                    if (typeof(x) == 'function') { onmessage = x; }
                    else { console.error('Callback must be Function'); }
                }
            });
            Object.defineProperty(wcc, 'onstatechange', {
                get: function() { return onstatechange; },
                set: function(x) {
                    if (typeof(x) == 'function') { onstatechange = x; }
                    else { console.error('Callback must be Function'); }
                }
            });

             // Methods declaration, read-only
            Object.defineProperty(wcc, 'send', { value: send });
            Object.defineProperty(wcc, 'getTs', { value: getTs });

            function send(data, type, to) {
                if (state == 'connected' || state == 'registered') {
                    var d = data || {};
                    var msg = {hub: hub, from: id, data: d};
                    if (to) msg.to = to;
                    if (type) msg.type = type;
                    msg.ts = getTs();
                    _ws.send(JSON.stringify(msg));
                }
            }

            function getTs() { return _tsDiff ? Date.now() - _tsDiff : 0; }

            function changeState(ste) {
                state = ste;
                if (wcc.onstatechange) {
                    setTimeout(function() { wcc.onstatechange(ste); }, 0);
                }
            }

            function connect() {
                _svrIdx = (_svrIdx + 1) % servers.length;
                _ws = new WebSocket(servers[_svrIdx]);
                changeState('connecting');

                _ws.onerror = function(e) {};
                _ws.onopen = function() {
                    changeState('connected');
                    send({name: config.id}, 'hi');
                };
                _ws.onmessage = function(msg) {
                    var ctx = JSON.parse(msg.data);
                    switch (ctx.type) {
                        case 'ho':
                            if (ctx.data.result && ctx.data.result == 'Success') {
                                _tsDiff = Date.now() - ctx.ts;
                                id = ctx.from
                                changeState('registered');
                                _pingTask = setInterval(function() { send({}, 'ping', id); }, _pingTime);
                            }
                            break;
                        default:
                            if (wcc.onmessage) {
                                setTimeout(function() { wcc.onmessage(ctx); }, 0);
                            }
                            break;
                    }
                };
                _ws.onclose = function(e) {
                    console.log('WCC Closed: (', e.code, ')');
                    changeState('disconnected');
                    clearInterval(_pingTask);
                    _ws = null;
                    setTimeout(function() { connect(); }, 0);
                };
            }

            // Main process
            id = '';
            hub = '' + (config.hub || 1000);
            servers = config.servers || '';

            connect();
        }
    })();
})();
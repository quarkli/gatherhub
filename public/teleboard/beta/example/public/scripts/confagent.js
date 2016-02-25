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

    // Module based public object: ConfAgent, Conference Agent based on PeerCom
    (function() {
        // Object-base shared local variables and functions

        // Export object Prototype to public namespace
        g.ConfAgent = ConfAgent;

        // Object Constructor
        function ConfAgent(pc) {
        	var ca = this;
            var peers, pstate, pmedchans, state;
            var onconfrequest, onconfresponse, onmedchancreated, onstatechange;
            var _mdesc, _muted;
            // Properties / Event Callbacks/ Methods declaration
            (function() {
                // read-only properties
                Object.defineProperty(ca, 'peers', {get: function() { return peers; }});
                Object.defineProperty(ca, 'pstate', {get: function() { return pstate; }});
                Object.defineProperty(ca, 'pmedchans', {get: function() { return pmedchans; }});
                Object.defineProperty(ca, 'mdesc', {get: function() { return _mdesc; }});
                Object.defineProperty(ca, 'state', {get: function() { return state; }});

                // Callbacks declaration, type check: function
                Object.defineProperty(ca, 'onconfrequest', {
                    get: function() { return onconfrequest; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onconfrequest = x; }
                        else { warn(hint.fcb, 'onconfrequest'); }
                    }
                });
                Object.defineProperty(ca, 'onconfresponse', {
                    get: function() { return onconfresponse; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onconfresponse = x; }
                        else { warn(hint.fcb, 'onconfresponse'); }
                    }
                });
                Object.defineProperty(ca, 'onmedchancreated', {
                    get: function() { return onmedchancreated; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onmedchancreated = x; }
                        else { warn(hint.fcb, 'onmedchancreated'); }
                    }
                });
                Object.defineProperty(ca, 'onstatechange', {
                    get: function() { return onstatechange; },
                    set: function(x) {
                        if (typeof(x) == 'function') { onstatechange = x; }
                        else { warn(hint.fcb, 'onstatechange'); }
                    }
                });

                // Methods declaration, read-only
                Object.defineProperty(ca, 'start', { value: start });
                Object.defineProperty(ca, 'addPeer', { value: addPeer });
                Object.defineProperty(ca, 'removePeer', { value: removePeer });
                Object.defineProperty(ca, 'request', { value: request });
                Object.defineProperty(ca, 'response', { value: response });
                Object.defineProperty(ca, 'mute', { value: mute });
                Object.defineProperty(ca, 'cancel', { value: cancel });
                Object.defineProperty(ca, 'exit', { value: exit });
                Object.defineProperty(ca, 'reset', { value: reset });
                Object.defineProperty(ca, 'consumemsg', { value: consumemsg });
                Object.defineProperty(ca, 'consumereq', { value: consumereq });
            })();

            function addPeer(p, state) {
            	if (peers.indexOf(p) < 0) {
            		// peer.state = new / joined / rejected / left
            		peers.push(p);
            		if (state) { pstate[p] = state; }
            		else { pstate[p] = 'wait'; }
            	}
            }

            function removePeer(p) {
				if (peers.indexOf(p) > -1) {
					peers.splice(peers.indexOf(p), 1);
					delete pstate[p];
                    pmedchans[p] = null;
                    delete pmedchans[p];
				}
            }

            function request(mdesc) {
            	if (state == 'idle') {
	            	_changeState('requesting');

	            	_mdesc = mdesc;
	            	_mdesc.confid = (parseInt(pc.id, 16) + Date.now()).toString(16);

	            	// set the requester state as host
	            	pstate[peers[0]] = 'host';

	            	peers.forEach(function(p){
	            		if (pc.peers[p]) {
		            		pc.send({cmd: 'offer', peers: peers, pstate: pstate, mdesc: _mdesc}, 'conf', p);
	            		}
	            	});
	            	return true;
            	}
            	else if (onerror) {
                    	setTimeout(function() { onerror('ConfAgent Error (request): Conference Agent is not idle state'); }, 0);
                }
                return false;
            }

            function response(res) {
            	if (state == 'waitanswer') {
            		if (res == 'accept') { pstate[peers[0]] = 'accepted'; }
            		else if (res == 'reject') { pstate[peers[0]] = 'rejected'; }

	            	peers.forEach(function(p){
	            		if (pc.peers[p]) {
		            		pc.send({cmd: 'response', peers: peers, pstate: pstate}, 'conf', p);
	            		}
	            	});

	            	if (res == 'reject') {
		            	reset();
		            	_changeState('idle');
	            	}
	            	else { _changeState('joining'); }
            	}
            	else {
 					if (onerror) {
                    	setTimeout(function() { onerror('ConfAgent Error (cancel): Conference Agnet is not in requesting state'); }, 0);
                	}
                }
            }

            function cancel() {
            	if (state == 'requesting') {
	            	peers.forEach(function(p){
	            		if (pc.peers[p]) {
		            		pc.send({cmd: 'cancel'}, 'conf', p);
	            		}
	            	});
	            	reset();
	            	_changeState('idle');
            	}
            }

            function mute() {
            	_muted = !_muted;
            	Object.keys(pmedchans).forEach(function(k) {
            		if (pmedchans[k].muted != _muted) { pmedchans[k].mute(); }
            	});
            }

            function exit() {
                pstate[peers[0]] = 'left';
                _notifyStateChange();

            	// exit conference and notify others
            	Object.keys(pmedchans).forEach(function(k) {
            		pmedchans[k].end();
            	});

                reset();
            }

            function reset() {
            	// end open sessions, remove all peers, restore all defaults
            	peers = [];
            	pstate = {};
            	pmedchans = {};
	            
            	addPeer(pc.id, 'wait');
            	_changeState('idle');
            }

            function consumemsg(msg) {
            	// process PeerCom messages which are concerned by ConfAgent
            	// return null if messaage is consumed, or return the message if useless to ConfAgent
            	if (msg.type == 'conf') {
            		switch (msg.data.cmd) {
            			case 'offer':
            				pstate[peers[0]] = 'wait';
            				_mdesc = msg.data.mdesc;
	                    	msg.data.peers.forEach(function(p) {
	                    		if (p != pc.id) { addPeer(p, msg.data.pstate[p]); }
	                    	});
            				// notify application with onconfrequest
			                if (onconfrequest) {
			                    setTimeout(function() {
			                    	onconfrequest(msg.data); 
			                    }, 0);
			                }
            				_changeState('waitanswer');
            				break;
            			case 'response':
            				// pass response to application for UI update
							if (onconfresponse) {
								if (pstate[msg.from] && msg.data.pstate[msg.from]) {
									pstate[msg.from] = msg.data.pstate[msg.from];
								}
			                    setTimeout(function() {
			                    	onconfresponse(msg); 
			                    }, 0);
			                }
			                if (msg.data.pstate[msg.from] == 'accepted') {
			                	if (pstate[peers[0]] == 'host' || pstate[peers[0]] == 'joined' || pstate[peers[0]] == 'accepted') {
				                	var id = pc.mediaRequest({to: msg.from, mdesc: _mdesc});
				                	if (id) {
				                		pstate[peers[0]] = 'joined';
				                		_notifyStateChange();

				                		if (!pmedchans[msg.from]) {
					                		pmedchans[msg.from] = pc.medchans[id];
                                            if (_muted) { pmedchans[msg.from].mute(); }
						            		if (onmedchancreated) {
							                    setTimeout(function() { onmedchancreated(pmedchans[msg.from]); }, 0);
						            		}
				                		}
				                	}
			                	}
			                }

            				// if response is accepted, make media request
                            if (peers.length < 3 && 
                                (msg.data.pstate[msg.from] == 'rejected' ||
                                msg.data.pstate[msg.from] == 'left')) { exit(); }
            				break;
            			case 'cancel':
                            exit();
                            break;
            			default:
            				reset();
            				_changeState('idle');
            				break;
            		}

            		return null;
            	}
            	else { return msg; }
            }

            function consumereq(req) {
            	// find if req is in peers.medchan then process it, or return it to application
            	if (req.mdesc.confid && req.mdesc.confid == _mdesc.confid && pc.medchans[req.id]) {
            		if (req.type == 'offer' && !pmedchans[req.from]) {
	        			pmedchans[req.from] = pc.medchans[req.id];
                        if (_muted) { pmedchans[req.from].mute(); }
	        			pc.mediaResponse(req, 'accept');
	            		if (onmedchancreated) {
		                    setTimeout(function() { onmedchancreated(pmedchans[req.from]); }, 0);
	            		}

	            		pstate[peers[0]] = 'joined';
	            		_notifyStateChange();
            		}

            		return null;
            	}
            	else { return req; }
            }

            function start() {
                reset();
            }

            function _changeState(ste) {
                state = ste;
                if (onstatechange) {
                    setTimeout(function() { onstatechange(state); }, 0);
                }
            }

            function _notifyStateChange() {
                peers.forEach(function(p) {
                    if (pc.peers[p]) { pc.send({cmd: 'response', peers: peers, pstate: pstate}, 'conf', p); }
                });
            }

            state = 'stopped';
            _muted = false;
		}
	})();	
})();
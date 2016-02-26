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
            var peers, pstate, pmedchans, state, muted;
            var onconfrequest, onconfresponse, onmedchancreated, onstatechange;
            var _mdesc;

            // Properties / Event Callbacks/ Methods declaration
            (function() {
                // read-only properties
                Object.defineProperty(ca, 'peers', {get: function() { return peers; }});
                Object.defineProperty(ca, 'pstate', {get: function() { return pstate; }});
                Object.defineProperty(ca, 'pmedchans', {get: function() { return pmedchans; }});
                Object.defineProperty(ca, 'mdesc', {get: function() { return _mdesc; }});
                Object.defineProperty(ca, 'state', {get: function() { return state; }});
                Object.defineProperty(ca, 'muted', {get: function() { return muted; }});

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
                Object.defineProperty(ca, 'close', { value: close });
                Object.defineProperty(ca, 'mute', { value: mute });
                Object.defineProperty(ca, 'cancel', { value: cancel });
                Object.defineProperty(ca, 'exit', { value: exit });
                Object.defineProperty(ca, 'reset', { value: reset });
                Object.defineProperty(ca, 'consumemsg', { value: consumemsg });
                Object.defineProperty(ca, 'consumereq', { value: consumereq });
            })();

            // add peer into conference, arg1: peer_id (PeerCom.id), arg2: default state, if empty, pstate = 'wait'
            function addPeer(p, s) {
            	if (peers.indexOf(p) < 0) {
            		// peer.state = new / joined / rejected / left
            		peers.push(p);
            		if (s) { pstate[p] = s; }
            		else { pstate[p] = 'wait'; }
            	}
            }

            // remove peer from conference, arg1: peer_ic (PeerCom.id)
            function removePeer(p) {
				if (peers.indexOf(p) > -1) {
					peers.splice(peers.indexOf(p), 1);
					delete pstate[p];
                    pmedchans[p] = null;    // pmedchans is pointed to PeerCom.medchans, must set pmedchans to null before delete it, otherwise PeerCom.medchans[x] will be deleted together
                    delete pmedchans[p];

                    if (state != 'idle' && peers.length == 1) { reset(); }   // reset ConfAgent when all peers left after conference initiated
				}
            }

            // request and response are sent to all peers in the conference indifferently
            // initiate conference request
            function request(mdesc) {
            	if (state == 'idle') {
	            	_changeState('requesting');

	            	_mdesc = mdesc;
	            	_mdesc.confid = (parseInt(pc.id, 16) + Date.now()).toString(16);

	            	// set the conference initiator state as host
	            	pstate[peers[0]] = 'host';

                    // send request to each peer through PeerCom
	            	peers.forEach(function(p){
	            		if (pc.peers[p]) {
		            		pc.send({cmd: 'offer', peers: peers, pstate: pstate, mdesc: _mdesc}, 'conf', p);
	            		}
	            	});

                    // return true for success
	            	return true;
            	}
            	else if (onerror) {
                    	setTimeout(function() { onerror('ConfAgent Error (request): Conference Agent is not idle state'); }, 0);
                }

                // ConfAgent can only make request when its state is 'idle'
                return false;
            }

            // make response to confernce request, answer can be either 'accept' or 'reject'
            function response(res) {
                // ConfAgent state enters to 'waitanswer' after receive an 'offer' request
                // response can only be made in 'waitanswer' state
            	if (state == 'waitanswer') {
                    _changeState('answering');
                    // change ConfAgent host peer state according to response and send to other peers
            		if (res == 'accept') { pstate[peers[0]] = 'accepted'; }
            		else if (res == 'reject') { pstate[peers[0]] = 'rejected'; }

	            	peers.forEach(function(p){
	            		if (pc.peers[p]) {
		            		pc.send({cmd: 'response', peers: peers, pstate: pstate}, 'conf', p);
	            		}
	            	});

                    // if response is 'reject', reset ConfAgent
	            	if (res == 'reject') { reset(); }
                    // if response is 'accept', change state to 'joining'
                    // untile completed media channel setup, peer is not considered as 'joined'
	            	else { _changeState('joining'); }
            	}
            	else {
 					if (onerror) {
                    	setTimeout(function() { onerror('ConfAgent Error (cancel): Conference Agnet is not in requesting state'); }, 0);
                	}
                }
            }

            // cancel request, can only be made in 'requesting' state
            function cancel() {
            	if (state == 'requesting') {
                    _changeState('canceling');
                    // send message to each peer
	            	peers.forEach(function(p){
	            		if (pc.peers[p]) {
		            		pc.send({cmd: 'cancel'}, 'conf', p);
	            		}
	            	});

                    // reset ConfAgent
	            	reset();
            	}
            }

            // specifically close a peer's connection, this should only be called when a peer was disconnected unexpectedly
            function close(p) {
                // if pmedchans exits, end it
                if (pmedchans[p]) { pmedchans[p].end(); }

                // set pstate to 'left' and notify applicate in a fake response event
                pstate[p] = 'left';
                if (onconfresponse) {
                    setTimeout(function() {
                        onconfresponse({from: p, type: 'conf', data: {cmd: 'response', peers: peers, pstate: pstate}}); 
                    }, 0);
                }
            }

            // mute microphone
            function mute() {
                // set local muted flag
            	muted = !muted;

                // set mute state of each media channel
            	Object.keys(pmedchans).forEach(function(k) {
            		if (pmedchans[k].muted != muted) { pmedchans[k].mute(); }
            	});
            }

            // request to leave conference
            function exit() {
                _changeState('leaving');
                // change ConfAgent host peer state and notify other peerss
                pstate[peers[0]] = 'left';
                _notifyStateChange();

            	// close all media channels by end() function
            	Object.keys(pmedchans).forEach(function(k) {
            		pmedchans[k].end();
            	});

                reset();
            }

            function reset() {
            	// end open sessions, remove all peers, restore all defaults
            	peers = [];
            	pstate = {};
                Object.keys(pmedchans).forEach(function(k) {
                    pmedchans[k] = null;
                    delete pmedchans[k];
                });
            	pmedchans = {};
	            
            	addPeer(pc.id, 'wait');    // the first peer in conference is always host peer
            	_changeState('idle');      // reset state to 'idle'
            }

            // ConfAgent shares PeerCom messaging dispatcher with applicaion,
            // application should call ConfAgent.consumemsg() first before processing PeerCom messages
            // if message is what ConfAgent concerns, it will be consumed and return null, or return as is if irrelavant
            function consumemsg(msg) {
            	if (msg.type == 'conf') {
            		switch (msg.data.cmd) {
            			case 'offer':
                            // ConfAgent can accept offer only in 'idle' state, if not idle, ignore the offer
                            if (state == 'idle') {
                                pstate[peers[0]] = 'wait';
                                // copy conference configuration in the offer to local properties
                                _mdesc = msg.data.mdesc;
                                // construct conference peer list according to the offer
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
                            }
            				break;
            			case 'response':
            				// pass response to application for UI update
							if (onconfresponse) {
                                // responding peer might have new state, update it before proceeding
								if (pstate[msg.from] && msg.data.pstate[msg.from]) {
									pstate[msg.from] = msg.data.pstate[msg.from];
								}
			                    setTimeout(function() {
			                    	onconfresponse(msg); 
			                    }, 0);
			                }

                            // if a peer sent an 'accept' response, any peer who received it 
                            // must initiate a media channel request to it, IF the peer HAS JOINED (JOINING) conference already
			                if (msg.data.pstate[msg.from] == 'accepted') {
			                	if (pstate[peers[0]] == 'host' || pstate[peers[0]] == 'joined' || pstate[peers[0]] == 'accepted') {
				                	var id = pc.mediaRequest({to: msg.from, mdesc: _mdesc});
                                    // PeerCom.mediaRequest() will return a valid medchan_id if success, or 0 in failure
				                	if (id) {
                                        // change host peer state and notify the others
				                		pstate[peers[0]] = 'joined';
				                		_notifyStateChange();

                                        // cache media channel local for ConfAgent self-management
				                		if (!pmedchans[msg.from]) {
					                		pmedchans[msg.from] = pc.medchans[id];
                                            // set media channel default mute state same a ConfAgent which might have been changed
                                            if (muted) { pmedchans[msg.from].mute(); }
                                            // notify application a new media channel is created
						            		if (onmedchancreated) {
							                    setTimeout(function() { onmedchancreated(pmedchans[msg.from]); }, 0);
						            		}
				                		}
				                	}
			                	}
			                }

            				// close conference if there is only host peer left in the room
                            if (peers.length < 3 && 
                                (msg.data.pstate[msg.from] == 'rejected' ||
                                msg.data.pstate[msg.from] == 'left')) { exit(); }
            				break;
            			case 'cancel':
                            // if host canceled request, ConfAgent might have already accepted request and initiated media channel
                            // call exit(), to properly close everything and leave
                            exit();
                            break;
            			default:
            				// reset();
            				// _changeState('idle');
            				break;
            		}

            		return null;
            	}
            	else { return msg; }
            }

            // To setup media channels need by ConfAgent, ConfAgent need to process PeerCom media request event
            // same as consumemsg, application should call consumereq first to let ConfAgent process concerned request
            function consumereq(req) {
                // PeerCom will automatically create a media channel in a new offer request
            	// if req has matched confid and exists in peers.medchan then process it, or return it to application
            	if (req.mdesc.confid && req.mdesc.confid == _mdesc.confid && pc.medchans[req.id]) {
                    // we only interested in answering (say 'yes') to an new offer reuqest (pmedchans[x] has not been created)
            		if (req.type == 'offer' && !pmedchans[req.from]) {
	        			pmedchans[req.from] = pc.medchans[req.id];
                        // set media channel default mute state to match ConfAgent's
                        if (muted) { pmedchans[req.from].mute(); }
                        // Auto-accept offer
	        			pc.mediaResponse(req, 'accept');
                        // notify application new media channel created
	            		if (onmedchancreated) {
		                    setTimeout(function() { onmedchancreated(pmedchans[req.from]); }, 0);
	            		}

                        // change host peer state and notify others
	            		pstate[peers[0]] = 'joined';
	            		_notifyStateChange();
            		}

            		return null;
            	}
            	else { return req; }
            }

            // ConfAgent is not auto-started, start() should be called after PeerCom.state = 'started'
            function start() {
                // re-initiate all properties
                reset();
            }

            function _changeState(ste) {
                state = ste;
                if (onstatechange) {
                    setTimeout(function() { onstatechange(state); }, 0);
                }
            }

            // standard notification to update ConfAgent properties changes
            function _notifyStateChange() {
                peers.forEach(function(p) {
                    if (pc.peers[p]) { pc.send({cmd: 'response', peers: peers, pstate: pstate}, 'conf', p); }
                });
            }

            // initiate defalut values
            peers = [];
            pstate = {};
            pmedchans = {};
            state = 'stopped';
            muted = false;
		}
	})();	
})();
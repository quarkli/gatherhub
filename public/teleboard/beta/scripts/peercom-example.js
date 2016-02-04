'use strict'
// Include dependent script
// include PeerCom Module

// Main Process
var mpc;
(function(){
	var id = 'someid';
	var hub = 'somehub';
	var servers = ['ws://minichat.gatherhub.com:55555', 'ws://192.168.11.123:55555'];
	var iceservers = [{'url': 'stun:chi2-tftp2.starnetusa.net'}];
	var pc = mpc = new Gatherhub.PeerCom({id: id, hub: hub, servers: servers, iceservers: iceservers});

	pc.onerror = function(e) { console.log(e); };
	pc.onstatechange = function(s) {
		console.log(s)
		// Handling process
	};
	pc.onpeerchange = function(peers) {
		console.log('Peers changed (' + Object.keys(peers).length + ')');
		// Update Peer List in UI
	};
	pc.onmessage = function(msg) {
		console.log('\nfrom:', msg.from);
		console.log('type:', msg.type);
		console.log('data:', msg.data);
		// Update message console in UI
	};
	pc.onmediarequest = function(req) {
		// Notify UI to respond to request
	};
	pc.onmediaresponse = function(rep) {
		// Setup UI according to response
	};

	// User send message to peerX in UI console
	if (pc.state == 'started') pc.send({msg: 'userMsg'}, 'message', 'peerX');
	// User send message to peers in UI console
	if (pc.state == 'started') pc.send({msg: 'userMsg'}, 'message');

	// User initiate media request (start/modify) examples
	pc.mediaRequest({request: 'req', media: 'audio', dir: 'both', to: 'peerX'});
	pc.mediaRequest({request: 'req', media: 'video', dir: 'recv', to: 'peerX'});
	pc.mediaRequest({request: 'req', media: 'avideo', dir: 'send'});
	pc.mediaRequest({request: 'req', media: 'screen', dir: 'none'});

	// User accept incoming media request
	pc.mediaResponse({request: 'req', answer: 'accept'});
	// User reject incoming media request
	pc.mediaResponse({request: 'req', answer: 'reject'});

	// Mute microphone
	pc.mediaCtrl({mic: 'off'});
})();
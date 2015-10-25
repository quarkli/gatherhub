'use strict';
var Emitter = require('./wildemitter');
//constructor
function PeerConn(options){
	var self = this;
	this.room = options.room;
	this.id = options.id;
	this.peer = new RTCPeerConnection(options.config, options.constraints);

	function onIce(event){
	  console.log('onIce: ', event);
	  if (event.candidate) {
	    self.emit('msg',{
				room: self.room,
				to: self.id,
				sdp: {
		      type: 'candidate',
		      label: event.candidate.sdpMLineIndex,
		      id: event.candidate.sdpMid,
		      candidate: event.candidate.candidate},
				});
	  } else {
	    console.log('End of candidates.');
	  }
	}

	function onRecv(event){
	  console.log('onRecv: ', event.data);
		self.emit('rdata',self.id,event.data);
	}

	function onDcChange(){
		self.emit('dcevt');
	}

	function onRStreamAdd(event){
		self.emit('rsadd',event.stream);
	}

	function onRStreamRm(event){
		self.emit('rsrm',event);
	}

	function onDcSetup(event){
		console.log('Receive Channel:',event.channel);
		self.dc = event.channel;
		self.dc.onmessage = onRecv;
		self.dc.onopen = onDcChange;
		self.dc.onclose = onDcChange;
	}


	this.peer.onicecandidate = onIce;
	if(options.type=='calling'){
		//add try catch(e) when needed.

    this.dc = this.peer.createDataChannel("sendDataChannel",{reliable: false});
	  console.log('sendDataChannel created!',this.dc);
    this.dc.onmessage = onRecv;
		this.dc.onopen = onDcChange;
		this.dc.onclose = onDcChange;
	}else{
		this.peer.ondatachannel = onDcSetup;
	}
	// add stream on add/remove callback
	this.peer.onaddstream = onRStreamAdd;
	this.peer.onremovestream = onRStreamRm;

}

Emitter.mixin(PeerConn);


PeerConn.prototype.makeOffer = function(){
	var self =this;
  this.peer.createOffer(function(desc){
  	console.log('makeOffer',desc);
	  self.peer.setLocalDescription(desc);
	  self.emit('msg',{room:self.room, to:self.id, sdp:desc});
	}, null, null);
};

PeerConn.prototype.makeAnswer = function(){
	var self =this;
  this.peer.createAnswer(function(desc){
  	console.log('makeAnswer');
	  self.peer.setLocalDescription(desc);
	  self.emit('msg',{room:self.room, to:self.id, sdp:desc});
	},null);

};

PeerConn.prototype.addStream =  function(stream){
	this.peer.addStream(stream);
};

PeerConn.prototype.removeStream = function(stream){
	this.peer.removeStream(stream);
};

PeerConn.prototype.setRemoteDescription = function(desc){
	this.peer.setRemoteDescription(desc);
	console.log('setRemoteDescription ',desc);
};

PeerConn.prototype.addIceCandidate = function(candidate){
	this.peer.addIceCandidate(candidate);
	console.log('addIceCandidate ',candidate);
};

PeerConn.prototype.close = function(){
  console.log('peerConnection close ',this.id);
	this.peer.close();
};

module.exports = PeerConn;

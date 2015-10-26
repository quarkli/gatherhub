'use strict';
var PeerConn = require('./peerconn');

//constructor
function HubCom(options){
	var self = this;
	var opts = this.opts = options || {};
	var room = opts.hubName || 'foo';
	var user = opts.usrName;
  var peers = this.peers = [];
	var socket = this.socket = io.connect();

	this.opts.room = room;
	this.opts.config = opts.config || {'iceServers': 
			[{'url': 'stun:chi2-tftp2.starnetusa.net'}]};
	this.opts.constraints = opts.constraints || {
		  'optional': [
		    {'DtlsSrtpKeyAgreement': false},
		    {'RtpDataChannels': true}
		  ]};
			
	this.media = new HubMedia(this);
	this.mediaActive = false;
	function getSockIdx(id){
		var i = 0;
		for(i=0;i<self.peers.length;i++){
			if((self.peers[i])&&(self.peers[i].id == id)){
				return i;
			}
		}
		return -1;
	}


	function regPconnEvtCb(pconn){
		pconn.on('msg',function(){
			self.socket.emit('msg',arguments[0]);
			//console.log("from pconn ",arguments[0]);
			
		});
		pconn.on('rdata',function(from,data){
			//self.emit('recv',from,data);
			self.onDataRecv(from,data);
		});
		pconn.on('dcevt',function(){
			var pconn;
			var state = false;
			self.peers.forEach(function(pconn){
				if(pconn.dc.readyState=="open"){
					state = true;
					console.log("data channel event is ",state);
					return;
				}
			})
			self.onDCChange(state);
		});
		pconn.on('rsadd',function(stream){
			//self.emit('rStreamAdd',stream);
			self.onRStreamAdd(stream);
		});
		pconn.on('rsrm',function(event){
			//self.emit('rStreamDel',stream);
			console.log('rStreamDel',event);
		});
	}

	
  socket.emit('join', room);

	//register socket event callback
	///// someone joined the hub room
	socket.on('joined', function (data){
	  console.log('Another peer # '+data.id+ ' made a request to join room ' + room);
		// id = data.id has joined into the room, create pc to connect it.
		//create peerconnection
		var id = data.id;
		var index = getSockIdx(id);
	  console.log('get index:', index);
		var pconn = self.peers[index];
		if(!pconn){
			var opts = self.opts;
			opts.id = id;
			opts.type = 'calling';
			pconn = new PeerConn(opts);
			self.peers[self.peers.length] = pconn;
			regPconnEvtCb(pconn);
		}

		if(self.localStream){
			pconn.addStream(self.localStream);
		}
		
		//create offer
		pconn.makeOffer();
	});

	//////someone leave the hub room
	socket.on('bye',function(data){
	  console.log('Another peer # '+data.id+ ' leave room ' + room);
		var id = data.id;
		var index = getSockIdx(id);

		console.log('release index '+index+ ' resource' );

		if(index>=0){
			self.peers[index].close();
			delete self.peers[index];
		}
	});

  //////////////handle the signal msg from otherside
	socket.on('msg', function (message){
		var id = message.from;
		var index = getSockIdx(id);
		console.log('get index:', index);

		var pconn = self.peers[index];
		console.log('Received message:', message);
		if (message.sdp.type === 'offer') {
			//get invite from other side
			if(!pconn){
				var opts = self.opts;
				opts.id = id;
				opts.type = 'called';
				pconn = new PeerConn(opts);
				self.peers[self.peers.length] = pconn;
				regPconnEvtCb(pconn);
			}

			/*if there is a local stream playing, we need remove this */
			if(self.localStream){
				self.media.stop();
			}
			
		  pconn.setRemoteDescription(new RTCSessionDescription(message.sdp));
			//make a answer
		  pconn.makeAnswer();
			
		} else if (message.sdp.type === 'answer' ) {
			if(!pconn){
				console.log("wrong answer id from "+id);
				return;
			}
		  pconn.setRemoteDescription(new RTCSessionDescription(message.sdp));
			
		} else if (message.sdp.type === 'candidate') {
			if(!pconn){
				console.log("wrong candidate id from "+id);
				return;
			}
		  var candidate = new RTCIceCandidate({sdpMLineIndex:message.sdp.label,
		    candidate:message.sdp.candidate});
		  pconn.addIceCandidate(candidate);
		} else if (message === 'bye' ) {
		}
		});

		/////////////// log from server
		socket.on('log', function (array){
		  console.log.apply(console, array);
		});
	  /////end of socket msg handler
	  
}


HubCom.prototype.sendData = function(data){
	this.peers.forEach(function(pconn){
		pconn.dc.send(data);
	});
};

HubCom.prototype.startAudioCast = function(){
	if(this.media.status === 0){
		this.media.start();
	}
};

HubCom.prototype.stopAudioCast = function(){
	this.media.stop();
};


/*some callback fuctions*/
HubCom.prototype.onDataRecv = function(){};
HubCom.prototype.onDCChange = function(){};
HubCom.prototype.onMediaAct = function(){};

////internal api called by media class

HubCom.prototype.addLocMedia = function(stream){
	if(this.opts.locAudio){
  	console.log('local stream added.');
		attachMediaStream(this.opts.locAudio,stream);
	}
	this.localStream = stream;
	this.peers.forEach(function(pconn){
		pconn.addStream(stream);
		pconn.makeOffer();
	});
};
HubCom.prototype.rmLocMedia = function(){
	this.localStream = undefined;
	this.peers.forEach(function(pconn){
		pconn.makeOffer();
	});
};

HubCom.prototype.setMediaAct = function(state){
	this.mediaActive = state;
	this.onMediaAct(state);
};

HubCom.prototype.onRStreamAdd = function(stream){
	if(this.opts.remAudio){
  	console.log('Remote stream added.');
  	attachMediaStream(this.opts.remAudio, stream);
	}
  //this.remoteStream = stream;
};


/////////////class HubMedia

function HubMedia(parent){
	this.parent = parent;
	this.status = 0;
}

HubMedia.prototype.mute = function(){
	if(this.localStream){
 		this.localStream.getTracks().forEach(function(track) {
      track.stop();
    });
	}
};


HubMedia.prototype.start = function (){
	var constraints = {audio: true};
	var self = this;
	function hdlMedia(stream){
		self.parent.addLocMedia(stream);
		self.parent.setMediaAct(true);
		self.localStream = stream;
	}
	function hdlMediaError(){
		self.parent.setMediaAct(false);
		self.status = 0;

	}
		
	/*stop previous local medias*/
	this.status = 1;
	this.mute();
	getUserMedia(constraints, hdlMedia, hdlMediaError);
};

HubMedia.prototype.stop = function (){
	this.mute();
	this.parent.rmLocMedia();
	this.parent.setMediaAct(false);
	this.status = 0;
};


module.exports = HubCom;


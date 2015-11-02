'use strict';
var PeerConn = require('./peerconn');

/////////////class HubMedia
var hubMedia;
(function(){
	var _proto;
	//constructor
	function HubMedia(){
		//status =  0:idle, 1,working
		this.status = 0;
	}

	//prototype apis
	_proto = HubMedia.prototype;
	_proto.mute = function(){
		if(this.localStream){
	 		this.localStream.getTracks().forEach(function(track) {
	      track.stop();
	    });
		}
	};
	_proto.start = function (){
		var constraints = {audio: true};
		var self = this;
		function hdlMedia(stream){
			self.onAddLStrm(stream);
			self.localStream = stream;
		}
		function hdlMediaError(){
			self.onLsError();
			self.status = 0;
		}
			
		/*stop previous local medias*/
		this.status = 1;
		this.mute();
		getUserMedia(constraints, hdlMedia, hdlMediaError);
	};

	_proto.stop = function (){
		this.mute();
		this.onRmLStrm();
		this.status = 0;
	};
	_proto.getStatus = function(){
		return this.status;
	};
	//cb function to inform event to external
	_proto.onAddLStrm = function(){};
	_proto.onRmLStrm = function(){};
	_proto.onLsError = function(){};
	//export 
	hubMedia = HubMedia;
})();



var hubCom;

(function(){
	var _proto;
	//constructor
	function HubCom(options){
		var self = this;
		//room and user configurations
		var opts = this.opts = options || {};
		var room = this.opts.room = opts.room || 'foo';
		var user = this.opts.usrName = opts.usrName || 'demo';
		//array to store webrtc peers
	  	var peers = this.peers = [];
		var socket = this.socket = io.connect();
		//ice configuration
		this.opts.config = opts.config || {'iceServers': 
				[{'url': 'stun:chi2-tftp2.starnetusa.net'}]};
		// peer constrains
		this.opts.constraints = opts.constraints || {
			  'optional': [
			    {'DtlsSrtpKeyAgreement': false},
			    {'RtpDataChannels': true}
			  ]};
		//local socket id 
		this.opts.usrId = -1;
		// user list keep the socket id list of all peers
		this.usrList = [];
		//media and media handlers		
		this.media = new hubMedia();
		regMediaEvtCb(this.media);
		this.mediaActive = 'idle';
		//media casting list
		this.castList = [];

		//internal methods for constructor
		function getSockIdx(id){
			var i = 0;
			for(i=0;i<self.peers.length;i++){
				if((self.peers[i])&&(self.peers[i].getId() == id)){
					return i;
				}
			}
			return -1;
		}
		//callback functions for media class
		function regMediaEvtCb(media){
			media.onAddLStrm = function(stream){
				self.addLocMedia(stream);
				self.setMediaAct('active');
			};
			media.onRmLStrm = function(){
				self.rmLocMedia();
				self.setMediaAct('idle');
			};
			media.onLsError = function(){
				self.setMediaAct('idle');
			};
		}
		//callback functions for peerconnections
		function regPconnEvtCb(pconn){
			pconn.onSend = function(h,c){
				self.socket.emit(h,c);
			};
			pconn.onDcRecv = function (from,data){
				var usr = self.usrList[from];
				self.onDataRecv(usr,data);
			};
			pconn.onDcState = function (){
				var pconn;
				var state = false;
				self.peers.forEach(function(pconn){
					if(pconn.getDcState()=="open"){
						state = true;
						console.log("data channel event is ",state);
						return;
					}
				});
				self.onDCChange(state);
			};
			pconn.onAddRStrm = 	function (stream){
				self.onRStreamAdd(stream);
			};
			pconn.onRmRStrm = function(event){
				console.log('rStreamDel',event);
			};
		}

		//send a initial msg to server to setup socket tunnel
	  	socket.emit('join', {room:room,user:user});

		//register socket event callback

		socket.on('connected', function (data){
			//console.log('userid is ', data.id);
			self.opts.usrId = data.id;
		});

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

	  	//////////////handle the signal msg from otherside
		socket.on('msg', function (message){
			var id = message.from;
			var usr = message.usr;
			var index = getSockIdx(id);
			console.log('get index:', index);

			if(id>=0 && usr){
				self.usrList[id] = usr;
				self.onUsrList(self.usrList);
			}

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
			} 
			});
			
			//////someone leave the hub room
			socket.on('bye',function(data){
			  console.log('Another peer # '+data.id+ ' leave room ' + room);
				var id = data.id;
				var index = getSockIdx(id);
				delete self.usrList[id];
				self.onUsrList(self.usrList);

				console.log('release index '+index+ ' resource' );

				if(index>=0){
					self.peers[index].close();
					delete self.peers[index];
				}
			});


			//////////////command for audio casting
			function getMediaCastList(audCon){
				//reset it everytime
				self.castList = [];

				if(audCon.state==1){
					if(audCon.talk == self.opts.usrId){
						self.castList[0] = self.opts.usrName + ' talking';
					}else{
						self.castList[0] = self.usrList[audCon.talk] + ' talking';
					}
					
					audCon.que.forEach(function(id){
						if(id == self.opts.usrId){
							self.castList[self.castList.length] = self.opts.usrName + ' pending';
						}else{
							self.castList[self.castList.length] = self.usrList[id] + ' pending';
						}
					});
				} 

			}
			socket.on('media', function (message){
				var cmd = message.cmd;
				if(cmd == 'ans'){
					if(self.media.status === 0){
						self.media.start();
					}
				}else if(cmd == 'update'){
					console.log('msg update',message.control);
					if(message.control){
						getMediaCastList(message.control);
						self.onCastList(self.castList);
					}
				}
			});

			/////////////// log from server
			socket.on('log', function (array){
			  console.log.apply(console, array);
			});
		  /////end of socket msg handler
		  

	} // end of HubCom contructor

	_proto = HubCom.prototype;

	_proto.sendData = function(data){
		this.peers.forEach(function(pconn){
			pconn.sendData(data);
		});
	};

	_proto.startAudioCast = function(){
		this.socket.emit('media',{room:this.opts.room,cmd:'req'});
		this.setMediaAct('pending');
	};

	_proto.stopAudioCast = function(){
		if(this.media.getStatus() === 1){
			this.media.stop();
		}
		this.socket.emit('media',{room:this.opts.room,cmd:'rls'});
		if(this.mediaActive == 'pending'){
			this.setMediaAct('idle');
		}
		
	};


	/*some callback fuctions*/
	_proto.onDataRecv = function(){};
	_proto.onDCChange = function(){};
	_proto.onMediaAct = function(){};
	_proto.onCastList = function(){};
	_proto.onUsrList = function(){};

	////internal api called by media class

	_proto.addLocMedia = function(stream){
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
	_proto.rmLocMedia = function(){
		this.localStream = undefined;
		this.peers.forEach(function(pconn){
			pconn.makeOffer();
		});
	};

	_proto.setMediaAct = function(state){
		this.mediaActive = state;
		this.onMediaAct(state);
	};

	_proto.onRStreamAdd = function(stream){
		if(this.opts.remAudio){
	  	console.log('Remote stream added.');
	  	attachMediaStream(this.opts.remAudio, stream);
		}
	  //this.remoteStream = stream;
	};

	hubCom =HubCom;

})();

module.exports = hubCom;


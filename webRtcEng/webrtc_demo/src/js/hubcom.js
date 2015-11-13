'use strict';
var PeerConn = require('./peerconn');
var webrtc = require('./webrtcsupport');
var getScreenMedia = require('./getscreenmedia');


/////////////class HubMedia
function muteStrm(s){
	if(s)s.getTracks().forEach(function(t){t.stop()});
}
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
		muteStrm(this.localStream);
	} 
	_proto.start = function (){
		var constraints = {audio: true};
		var self = this;
			
		/*stop previous local medias*/
		this.status = 1;
		this.mute();
		getUserMedia(constraints, function(s){
			self.onAddLStrm(s);
			self.localStream = s;
		}, function(){
			self.onLsError();
			self.status = 0;
		});
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
	var rtcsupport;
	//constructor
	function HubCom(options){
		var self = this;
		//room and user configurations
		var opts = this.opts = options || {};
		var room = this.opts.room = opts.room || 'foo';
		var user = this.opts.usrName = opts.usrName || 'demo';
		//array to store webrtc peers
	  	var peers = this.peers = [];
	  	//socket communicate with server
		var socket = this.socket = io.connect();
		//extra peer connections for client that does not support webrtc
		var exPeers = this.exPeers = [];

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
		//two way calls
		this.twoway = opts.twoway;
		this.negoiateState = 0;

		//rtcsupport
		rtcsupport = webrtc.support;


		//internal methods for constructor
		//register callback functions for media class
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
		//search valid peer id from peers
		function getSockIdx(id){
			var i = 0;
			for(i=0;i<self.peers.length;i++){
				if((self.peers[i])&&(self.peers[i].getId() == id)){
					return i;
				}
			}
			return -1;
		}
		//register callback functions for peerconnections
		function regPconnEvtCb(pc){
			pc.onSend = function(h,c){
				self.socket.emit(h,c);
			};
			pc.onDcRecv = function (from,data){
				var usr = self.usrList[from];
				self.onDataRecv(usr,data);
			};
			pc.onAddRStrm = 	function (s){
				self.onRStreamAdd(s);
			};
			pc.onRmRStrm = function(s){
				console.log('rStreamDel',s);
				self.onRStreamDel(s)
			};
			pc.onConError = function(id){
				console.log('peer ',id+'connect error');
				createExPr('calling',id);
				removePeer(id);
			};
		}
		//create peerconnections
		function createPeer(type,id,sdp){
			var index = getSockIdx(id);
		  	// console.log('get index:', index);
			var pc = self.peers[index];
			if(!pc){
				var opts = self.opts;
				opts.id = id;
				opts.type = type;
				pc = new PeerConn(opts);
				self.peers[self.peers.length] = pc;
				regPconnEvtCb(pc);
			}

			//udpate call type

			if(type == 'calling'){
				if(self.localStream){
					pc.addStream(self.localStream);
				}
				if(self.scnStrm){
					pc.addStream(self.scnStrm);
				}
				//create offer
				pc.makeOffer();
			}else{
				//recieve offer part is called
				pc.callType(type);
				pc.negoState(true);
				if(self.twoway == true){
					//check whether sdp contain audio on/off information
					if(isSdpWithAudio(sdp.sdp)){
						console.log('offer with audio sdp');
						if(self.media.status==0){
							self.media.start();
					  		pc.setRmtDesc(sdp);
					}else{
						  	pc.setRmtDesc(sdp);
					  		pc.makeAnswer();
						}
					}else{
						console.log('offer without audio!');
						if(self.media.status==1){
							self.media.stop();
					  		pc.setRmtDesc(sdp);
					}else{
						  	pc.setRmtDesc(sdp);
					  		pc.makeAnswer();
						}
					}

				}else{
					/*if there is a local stream playing, we need remove this */
					if(self.localStream){
						self.media.stop();
					}
				  	pc.setRmtDesc(sdp);
			  		pc.makeAnswer();
				}
			}
	
		}

		function removePeer(id){
			var index = getSockIdx(id);
			if(index>=0){
				self.peers[index].close();
				delete self.peers[index];
			}
		}

		//create extra peers for client that do not support webrtc
		function createExPr(type,id){
			var exPr = self.exPeers[id];
			if(!exPr){
				self.exPeers[id] =  id;
			}
			console.log('crateExPr ',type + 'id ' + id );
			if(type == 'calling'){
				self.socket.emit('msg',{
                    room: self.opts.room,
                    to: id,
                    sdp: {type: 'exoffer'},
                    });

			}else{
				self.socket.emit('msg',{
                    room: self.opts.room,
                    to: id,
                    sdp: {type: 'exanswer'},
                    });
			}
		}

		function removeExPr(id){
			delete self.exPeers[id];
		}

		function isSdpWithAudio(s){
			var sdps,idx,sdp,ret;
			ret = false;
			sdps =s.split('m=');
			sdps.forEach(function(d){
				sdp = 'm=' +d;
				idx = sdp.search('m=audio');
				if(idx >=0){
					if(sdp.slice(idx).search('a=sendrecv')>=0){
						ret = true;
						return;
					}
				}
			});
			return ret;
		}

		//parse signal messages from other peers
		function parseSigMsg(msg){
			var id = msg.from;
			var usr = msg.usr;
			var index = getSockIdx(id);
			console.log('get index:', index);

			if(id>=0 && usr){
				self.usrList[id] = usr;
				self.onUsrList(self.usrList);
				//console.log('usrList is ',self.usrList);
			}

			var pc = self.peers[index];
			console.log('Received msg:', msg);
			if (msg.sdp.type === 'offer') {
				//get invite from other side
				createPeer('called',id,msg.sdp);
				
			} else if (msg.sdp.type === 'answer' ) {
				if(!pc){
					console.log("wrong answer id from "+id);
					return;
				}
			  pc.setRmtDesc(msg.sdp);
				
			} else if (msg.sdp.type === 'candidate') {
				if(!pc){
					console.log("wrong candidate id from "+id);
					return;
				}
			  var candidate = new RTCIceCandidate({sdpMLineIndex:msg.sdp.label,
			    candidate:msg.sdp.candidate});
			  pc.addIceCandidate(candidate);
			} else if (msg.sdp.type === 'exoffer'){
				createExPr('called',id);
				removePeer(id);
			}

		}

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

		function showWebRtcSupport(){
			if(rtcsupport == true){
				self.onWarnMsg('');
			}else{
				self.onWarnMsg('Your browser could not support webrtc, you could not use media casting!');
			}			
		}


		//send a initial msg to server to setup socket tunnel
	  	socket.emit('join', {room:room,user:user,rtc:rtcsupport});

		//register socket event callback

		socket.on('connected', function (data){
			//console.log('userid is ', data.id);
			self.opts.usrId = data.id;
			showWebRtcSupport();
		});

		///// someone joined the hub room
		socket.on('joined', function (data){
			console.log('Another peer # '+data.id+ ' made a request to join room ' + room);
			// id = data.id has joined into the room, create pc to connect it.
			if(rtcsupport && data.rtc){
				//create peerconnection
				createPeer('calling',data.id,null);
			}else{
				createExPr('calling',data.id);
			}
		});

	  	//////////////handle the signal msg from otherside
		socket.on('msg', function (data){
			parseSigMsg(data);
		});

		// data transfer from server
		socket.on('dat',function(data){
			var usr = self.usrList[data.from];
			self.onDataRecv(usr,data.dat);
		});
			
		//////someone leave the hub room
		socket.on('bye',function(data){
			console.log('Another peer # '+data.id+ ' leave room ' + room);
			var id = data.id;

			delete self.usrList[id];
			self.onUsrList(self.usrList);
			removeExPr(id);
			removePeer(id);
		});


		socket.on('media', function (message){
			var cmd = message.cmd;
			if(rtcsupport!=true){
				console.log('warning ','could not support media casting!');
				return;
			}
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

		socket.on('err',function(m){
			if(m == 'con-lost'){
				//re init connection
	  			socket.emit('join', {room:room,user:user,rtc:rtcsupport});
			}
		});
	  /////end of socket msg handler
	  

	} // end of HubCom contructor

	_proto = HubCom.prototype;

	_proto.sendData = function(data){
		var self = this;
		this.peers.forEach(function(pc){
			pc.sendData(data);
		});
		this.exPeers.forEach(function(id){
			self.socket.emit('dat',{
                room: self.opts.room,
                to: id,
                dat: data });
		});
	};

	_proto.startAudioCast = function(){
		if(rtcsupport!=true){
			console.log('warning ','could not support media casting!');
			return;
		}
		if(this.checkHubReady()==false){
			console.log('warning ','STUN Error,could not support media casting!');
			return;
		}
		if(this.twoway == true){
			if(this.media.status==0)this.media.start();

		}else{
			this.socket.emit('media',{room:this.opts.room,cmd:'req'});
			this.setMediaAct('pending');
		}
	};

	_proto.stopAudioCast = function(){
		if(this.media.getStatus() === 1){
			this.media.stop();
		}
		if(this.twoway != true){
			this.socket.emit('media',{room:this.opts.room,cmd:'rls'});
		}
		if(this.mediaActive == 'pending'){
			this.setMediaAct('idle');
		}
		
	};

	_proto.checkHubReady = 	function(){
		var rd =  false;
		this.peers.forEach(function(p){
			if(p.getDcState()){
				rd = true;
			}
		});
		if(rd == false){
			this.onWarnMsg('network connection error, you could not use media casting!');
		}
		return rd;
	};

	_proto.startScnShare = function(onSuc,onErr){
		var self = this;
		var ss = this.scnStrm;
		if(ss)muteStrm(ss);
		getScreenMedia(function(err,s){
			if(!err){
				self.scnStrm = s;
				self.peers.forEach(function(pc){
					pc.addStream(s);
					pc.makeOffer();
				});
				self.scnState =  true;
				if(onSuc)onSuc(s);
			}else{
				console.log('getScn failed ',err.name);
				if(onErr)onErr(err);
			}
		});

	};

	_proto.stopScnShare = function(){
		var s = this.scnStrm;
		if(s)muteStrm(s);
		this.peers.forEach(function(pc){
			pc.removeStream(s);
			pc.makeOffer();
		});
	}



	/*some callback fuctions*/
	_proto.onDataRecv = function(){};
	_proto.onMediaAct = function(){};
	_proto.onCastList = function(){};
	_proto.onUsrList = function(){};
	_proto.onWarnMsg = function(){};
	_proto.onLMedAdd = function(){};
	_proto.onRMedAdd = function(){};
	_proto.onRMedDel = function(){};

	////internal api called by media class

	_proto.addLocMedia = function(s){
		// if(this.opts.locAudio){
	 //  	console.log('local stream added.');
		// 	attachMediaStream(this.opts.locAudio,stream);
		// }
		this.onLMedAdd(s);
		this.localStream = s;
		this.peers.forEach(function(pc){
			pc.addStream(s);
			if(pc.negoState()){
				pc.makeAnswer();
			}else{
				pc.makeOffer();
			}


		});
	};
	_proto.rmLocMedia = function(){
		var s = this.localStream;
		this.peers.forEach(function(pc){
			pc.removeStream(s);
			if(pc.negoState()){
				pc.makeAnswer();
			}else{
				pc.makeOffer();
			}
		});
		this.localStream = undefined;
	};

	_proto.setMediaAct = function(state){
		this.mediaActive = state;
		this.onMediaAct(state);
	};

	_proto.onRStreamAdd = function(s){
		var m = {};
		m.video = (s.getVideoTracks().length>0)?true:false;
		m.stream =  s;
		this.onRMedAdd(m);
	};

	_proto.onRStreamDel = function(s){
		this.onRMedDel(s);
	}

	hubCom =HubCom;

})();

module.exports = hubCom;

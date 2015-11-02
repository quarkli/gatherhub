(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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


},{"./peerconn":3}],2:[function(require,module,exports){
'use strict';
var HubCom = require('./hubcom');


var mediaButton = document.getElementById("mediaButton");
var mediaArea = document.getElementById("mediaAreas");

var localAudio = document.querySelector('#localAudio');
var remoteAudio = document.querySelector('#remoteAudio');

var castingList = document.getElementById("castingList");



var options = {};
/*pass local and remote audio element to hubcom*/
options.locAudio = localAudio;
options.remAudio = remoteAudio;

/*get userName*/
var user = prompt("Please enter your name","");
var user ;
if(!user){
	user = 'demo'+Math.ceil(Math.random()*1000);
}

options.usrName = user;

var hubCom = new HubCom(options);

hubCom.onDCChange = hdlDCchange;
hubCom.onDataRecv = hdlDataRecv;
hubCom.onMediaAct =  hdlMedAct;
hubCom.onCastList = updateCastList;
mediaButton.onclick = invokeMedia;



$('.message-input').keydown(function(e) {
    /* Act on the event */
    if(e.ctrlKey && e.keyCode == 13){
        sendData();
    }
});
$('#msgsend').click(function(event) {
  sendData();
  $('.message-input').focus();
});

function addMsgHistory(data,type){
	var chatText;
    if(type == 1){
      chatText = '<li class="list-group-item list-group-item-info text-right">'+data+'</li>' ;   
    }else{
      chatText = '<li class="list-group-item">'+data+'</li>' ;   
    }
	$('.messages').append(chatText);
	console.log('show message:',chatText);
}


function sendData() {
  var data = $('.message-input').val();
	if(data&&data!=''){
		hubCom.sendData(data);	
		addMsgHistory(user+': '+data,1);
	  // console.log('Sent data: ' + data);
    $('.message-input').val(''); 
	}
}


function hdlDCchange(state){
	// enableMsgInf(state);
}


function hdlDataRecv(from, data) {
  console.log('Received message from ' + from + ' msg is: ' + data);
	addMsgHistory(from+': '+data,0);

}

function hdlMedAct(state){
	switch(state){
	case 'active':
		mediaButton.innerHTML = "Stop Broadcast"
		break;
	case 'pending':
		mediaButton.innerHTML = "Trying...Cancel?"
		break;
	case 'idle':
		mediaButton.innerHTML = "Start Broadcast"
		break;
	}
}

function invokeMedia(){
	if(hubCom.mediaActive == 'idle'){
		hubCom.startAudioCast();
	}else{
		hubCom.stopAudioCast();
	}
}

function updateCastList(list){
	castingList.innerHTML = '';
	list.forEach(function(item){
		castingList.innerHTML += '<p>' + item + '</p>';
	});
	//console.log('casting list',castingList.innerHTML);
	
}



},{"./hubcom":1}],3:[function(require,module,exports){
'use strict';

var peerConn;

(function(){
    var _proto;

    //constructors
    function PeerConn(options){
        var self;
        self = this;
        this.room = options.room;
        this.id = options.id;
        this.peer =  RTCPeerConnection(options.config, options.constraints);
       
        if(options.type=='calling'){
            this.dc = this.peer.createDataChannel("sendDataChannel",{reliable: false});
            console.log('sendDataChannel created!',this.dc);
            this.dc.onmessage = onRecv;
            this.dc.onopen = this.onDcState;
            this.dc.onclose = this.onDcState;
        }else{
            this.peer.ondatachannel = onDcSetup;
        }

        this.peer.onicecandidate = onIce;
        this.peer.onaddstream = onRStrmAdd;
        this.peer.onremovestream = onRStrmRm;

        //internal methods
        function onIce(event){
          console.log('onIce: ', event);
          if (event.candidate) {
            self.onSend('msg',{
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

        function onDcSetup(event){
            console.log('Receive Channel:',event.channel);
            self.dc = event.channel;
            self.dc.onmessage = onRecv;
            self.dc.onopen = self.onDcState;
            self.dc.onclose = self.onDcState;
        }

        function onRecv(event){
          console.log('onRecv: ', event.data);
            self.onDcRecv(self.id,event.data);
        }
        function onRStrmAdd(event){
            self.onAddRStrm(event.stream);
        }

        function onRStrmRm(event){
            self.onRmRStrm(event.stream);
        }

    }

    //export obj
    peerConn = PeerConn;

 
    //prototype
    _proto = PeerConn.prototype ;
    //cb functions
    _proto.onSend = function(){};
    _proto.onDcRecv = function(){};
    _proto.onDcState = function(){};
    _proto.onAddRStrm = function(){};
    _proto.onRmRStrm = function(){};

    //api method
    _proto.makeOffer = function(){
        var self = this;
        this.peer.createOffer(function(desc){
            console.log('makeOffer',desc);
            self.peer.setLocalDescription(desc);
            self.onSend('msg',{room:self.room, to:self.id, sdp:desc});
        }, null, null);
    };

    _proto.makeAnswer = function(){
        var self = this;
        this.peer.createAnswer(function(desc){
            console.log('makeAnswer');
            self.peer.setLocalDescription(desc);
            self.onSend('msg',{room:self.room, to:self.id, sdp:desc});
        },null);

    };

    _proto.addStream =  function(stream){
        this.peer.addStream(stream);
    };

    _proto.removeStream = function(stream){
        this.peer.removeStream(stream);
    };

    _proto.setRemoteDescription = function(desc){
        this.peer.setRemoteDescription(desc);
        console.log('setRemoteDescription ',desc);
    };

    _proto.addIceCandidate = function(candidate){
        this.peer.addIceCandidate(candidate);
        console.log('addIceCandidate ',candidate);
    };

    _proto.close = function(){
        console.log('peerConnection close ',this.id);
        this.peer.close();
    };

    _proto.getId = function(){
        return this.id;
    };

    _proto.sendData = function(data){
        this.dc.send(data);
    };

    _proto.getDcState =  function(){
        return this.dc.readyState;
    };


})();

module.exports = peerConn;

},{}]},{},[2]);

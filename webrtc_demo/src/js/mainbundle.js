(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// getScreenMedia helper by @HenrikJoreteg
// modified by phenix
// var getUserMedia = require('getusermedia');

'use strict';

// cache for constraints and callback
var cache = {};
var getUMedia = function(constraints,cb){
    getUserMedia(constraints, function (stream) {
            cb(null, stream);
        }, function (err) {
            var error;
            // coerce into an error object since FF gives us a string
            // there are only two valid names according to the spec
            // we coerce all non-denied to "constraint not satisfied".
            console.log('getUserMedia','error'+err.name);
            if (typeof err === 'string') {
                error = new Error('MediaStreamError');
                if (err === denied || err === altDenied) {
                    error.name = denied;
                } else {
                    error.name = notSatisfied;
                }
            } else {
                // if we get an error object make sure '.name' property is set
                // according to spec: http://dev.w3.org/2011/webrtc/editor/getusermedia.html#navigatorusermediaerror-and-navigatorusermediaerrorcallback
                error = err;
                if (!error.name) {
                    // this is likely chrome which
                    // sets a property called "ERROR_DENIED" on the error object
                    // if so we make sure to set a name
                    if (error[denied]) {
                        err.name = denied;
                    } else {
                        err.name = notSatisfied;
                    }
                }
            }
            cb(error);
        });    
};


module.exports = function (constraints, cb) {
    var hasConstraints = arguments.length === 2;
    var callback = hasConstraints ? cb : constraints;
    var error;

    if (typeof window === 'undefined' || window.location.protocol === 'http:') {
        error = new Error('NavigatorUserMediaError');
        error.name = 'HTTPS_REQUIRED';
        return callback(error);
    }

    if (window.navigator.userAgent.match('Chrome')) {
        var chromever = parseInt(window.navigator.userAgent.match(/Chrome\/(.*) /)[1], 10);
        var maxver = 33;
        var isCef = !window.chrome.webstore;
        // "known" crash in chrome 34 and 35 on linux
        if (window.navigator.userAgent.match('Linux')) maxver = 35;

        // check that the extension is installed by looking for a
        // sessionStorage variable that contains the extension id
        // this has to be set after installation unless the contest
        // script does that
        if (sessionStorage.getScreenMediaJSExtensionId) {
            chrome.runtime.sendMessage(sessionStorage.getScreenMediaJSExtensionId,
                {type:'getScreen', id: 1}, null,
                function (data) {
                    if (!data || data.sourceId === '') { // user canceled
                        var error = new Error('NavigatorUserMediaError');
                        error.name = 'PERMISSION_DENIED';
                        callback(error);
                    } else {
                        constraints = (hasConstraints && constraints) || {audio: false, video: {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                maxWidth: window.screen.width,
                                maxHeight: window.screen.height,
                                maxFrameRate: 3
                            },
                            optional: [
                                {googLeakyBucket: true},
                                {googTemporalLayeredScreencast: true}
                            ]
                        }};
                        constraints.video.mandatory.chromeMediaSourceId = data.sourceId;
                        getUMedia(constraints, callback);
                    }
                }
            );
        } else if (window.cefGetScreenMedia) {
            //window.cefGetScreenMedia is experimental - may be removed without notice
            window.cefGetScreenMedia(function(sourceId) {
                if (!sourceId) {
                    var error = new Error('cefGetScreenMediaError');
                    error.name = 'CEF_GETSCREENMEDIA_CANCELED';
                    callback(error);
                } else {
                    constraints = (hasConstraints && constraints) || {audio: false, video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            maxWidth: window.screen.width,
                            maxHeight: window.screen.height,
                            maxFrameRate: 3
                        },
                        optional: [
                            {googLeakyBucket: true},
                            {googTemporalLayeredScreencast: true}
                        ]
                    }};
                    constraints.video.mandatory.chromeMediaSourceId = sourceId;
                    getUMedia(constraints, callback);
                }
            });
        } else if (isCef || (chromever >= 26 && chromever <= maxver)) {
            // chrome 26 - chrome 33 way to do it -- requires bad chrome://flags
            // note: this is basically in maintenance mode and will go away soon
            constraints = (hasConstraints && constraints) || {
                video: {
                    mandatory: {
                        googLeakyBucket: true,
                        maxWidth: window.screen.width,
                        maxHeight: window.screen.height,
                        maxFrameRate: 3,
                        chromeMediaSource: 'screen'
                    }
                }
            };
            getUMedia(constraints, callback);
        } else {
            // chrome 34+ way requiring an extension
            var pending = window.setTimeout(function () {
                error = new Error('NavigatorUserMediaError');
                error.name = 'EXTENSION_UNAVAILABLE';
                return callback(error);
            }, 1000);
            cache[pending] = [callback, hasConstraints ? constraint : null];
            window.postMessage({ type: 'getScreen', id: pending }, '*');
        }
    } else if (window.navigator.userAgent.match('Firefox')) {
        var ffver = parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10);
        if (ffver >= 33) {
            constraints = (hasConstraints && constraints) || {
                video: {
                    mozMediaSource: 'window',
                    mediaSource: 'window'
                }
            }
            getUMedia(constraints, function (err, stream) {
                callback(err, stream);
                // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1045810
                if (!err) {
                    var lastTime = stream.currentTime;
                    var polly = window.setInterval(function () {
                        if (!stream) window.clearInterval(polly);
                        if (stream.currentTime == lastTime) {
                            window.clearInterval(polly);
                            if (stream.onended) {
                                stream.onended();
                            }
                        }
                        lastTime = stream.currentTime;
                    }, 500);
                }
            });
        } else {
            error = new Error('NavigatorUserMediaError');
            error.name = 'EXTENSION_UNAVAILABLE'; // does not make much sense but...
        }
    }
};

window.addEventListener('message', function (event) {
    if (event.origin != window.location.origin) {
        return;
    }
    if (event.data.type == 'gotScreen' && cache[event.data.id]) {
        var data = cache[event.data.id];
        var constraints = data[1];
        var callback = data[0];
        delete cache[event.data.id];

        if (event.data.sourceId === '') { // user canceled
            var error = new Error('NavigatorUserMediaError');
            error.name = 'PERMISSION_DENIED';
            callback(error);
        } else {
            constraints = constraints || {audio: false, video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    maxWidth: window.screen.width,
                    maxHeight: window.screen.height,
                    maxFrameRate: 3
                },
                optional: [
                    {googLeakyBucket: true},
                    {googTemporalLayeredScreencast: true}
                ]
            }};
            constraints.video.mandatory.chromeMediaSourceId = event.data.sourceId;
            getUMedia(constraints, callback);
        }
    } else if (event.data.type == 'getScreenPending') {
        window.clearTimeout(event.data.id);
    }
});

},{}],2:[function(require,module,exports){
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


},{"./getscreenmedia":1,"./peerconn":4,"./webrtcsupport":5}],3:[function(require,module,exports){
'use strict';
var HubCom = require('./hubcom');


var mediaButton = document.getElementById("mediaButton");

var localAudio = document.querySelector('#localAudio');
// var remoteAudio = document.querySelector('#remoteAudio');
var ssAct = 'idle'; //screen share active mark

var options = {};
/*pass local and remote audio element to hubcom*/
// options.locAudio = localAudio;
// options.remAudio = remoteAudio;
options.twoway = false;

/*get userName*/
var user = prompt("Please enter your name","");
var user ;
if(!user){
	user = 'demo'+Math.ceil(Math.random()*1000);
}

options.usrName = user;

var hubCom = new HubCom(options);


hubCom.onDataRecv = hdlDataRecv;
hubCom.onMediaAct =  hdlMedAct;
hubCom.onCastList = updateCastList;
hubCom.onUsrList = updateUsrList;
hubCom.onWarnMsg = showWarnMsg;
hubCom.onLMedAdd = hdlLMedAdd;
hubCom.onRMedAdd = hdlRMedAdd;
hubCom.onRMedDel = hdlRMedDel;
mediaButton.onclick = invokeMedia;


$('.message-input').keydown(function(e) {
    /* Act on the event */
    if(e.ctrlKey && e.keyCode == 13){
        sendData();
    }
});
$('#msgsend').click(function(event) {
    sendData();
    event.preventDefault();
});

function addMsgHistory(data,type){
	var chatText;
    if(type == 1){
      chatText = '<li class="list-group-item list-group-item-info text-right">'+data+'</li>' ;   
    }else{
      chatText = '<li class="list-group-item">'+data+'</li>' ;   
    }
	 $('.messages').append(chatText);
}


function sendData() {
  var data = $('.message-input').val();
	if(data&&data!=''){
		hubCom.sendData(data);	
		addMsgHistory(user+': '+data,1);
    $('.message-input').val(''); 
	}
}


function hdlDataRecv(from, data) {
  console.log('Received message from ' + from + ' msg is: ' + data);
	addMsgHistory(from+': '+data,0);

}

function updateUsrList(list){
    var usrStr;
    usrStr = '<ul class="list-group"> <li class="list-group-item active">' + user + '</li>';
     $('#usrList').html(usrStr);
    list.forEach(function(s){
        usrStr = '<li class="list-group-item list-group-item-warning">' + s + '</li>';
        $('#usrList').append(usrStr);
    });
    $('#usrList').append('</ul>');

}
var medList = [];

function hdlLMedAdd(s){
    attachMediaStream(localAudio,s);
}

function hdlRMedAdd(s){
    //<audio id='localAudio' autoplay muted></audio>
    var mNode,m;
    mNode = {};
    if(s.video){
        mNode.id = 'rVideo'+medList.length;
        mNode.ln = "<video id="+mNode.id+" autoplay></video>"

    }else{
        mNode.id = 'rAudio'+medList.length;
        mNode.ln = "<audio id="+mNode.id+" autoplay></audio>"
    }
    mNode.s = s.stream;
    medList[medList.length] = mNode;
    $('.rStrmList').append(mNode.ln);
    m = document.querySelector('#'+mNode.id);
    attachMediaStream(m,s.stream);
}

function hdlRMedDel(s){
    var i, len;
    len = medList.length;
    for(i=0;i<len;i++){
        if(medList[i] && medList[i].s == s){
            $('#'+medList[i].id).remove();
            delete medList[i];
            return;
        }
    }
}

function hdlMedAct(state){
	switch(state){
	case 'active':
		mediaButton.innerHTML = "Stop Audio"
		break;
	case 'pending':
		mediaButton.innerHTML = "Trying...Cancel?"
		break;
	case 'idle':
		mediaButton.innerHTML = "Start Audio"
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
    $('#castingList').html('');
	list.forEach(function(item){
		$('#castingList').append('<p>' + item + '</p>') ;
	});
}

function showWarnMsg(msg){

    if(msg==''){
        $('.warn-msg').hide();
    }else{
        $('.warn-msg').show();
        $('.voice-list').hide();
    }
    console.log('warn msg ',msg);
    $('.warn-msg').html('<strong>Warning: </strong>' + msg);
}
$('#scnButton').click(function(event) {
    if(ssAct == 'idle'){
        hubCom.startScnShare(function(){
            ssAct = 'active';
        },function(){
            ssAct = 'idle';
        });
    }else{
        hubCom.stopScnShare();
        ssAct = 'idle';
    }
    event.preventDefault();
});
},{"./hubcom":2}],4:[function(require,module,exports){
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
            this.dc.onopen = onDcState;
            this.dc.onclose = onDcState;
        }else{
            this.peer.ondatachannel = onDcSetup;
        }

        this.peer.onicecandidate = onIce;
        this.peer.onaddstream = onRStrmAdd;
        this.peer.onremovestream = onRStrmRm;
        this.ctyp = options.type;
        this.negostate = false;

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
            console.log('End of candidates.','dc channel state is '+self.dc.readyState);
            if(self.ctyp == 'calling' && self.dc.readyState != 'open'){
                self.onConError(self.id);
            }
          }
        }

        function onDcSetup(event){
            console.log('Receive Channel:',event.channel);
            self.dc = event.channel;
            self.dc.onmessage = onRecv;
            self.dc.onopen = onDcState;
            self.dc.onclose = onDcState;
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
        function onDcState(){
            console.log('info ','datachannel state is '+self.dc.readyState);
        }

    }

    //export obj
    peerConn = PeerConn;

 
    //prototype
    _proto = PeerConn.prototype ;
    //cb functions
    _proto.onSend = function(){};
    _proto.onDcRecv = function(){};
    _proto.onAddRStrm = function(){};
    _proto.onRmRStrm = function(){};
    _proto.onConError = function(){};

    //api method
    _proto.makeOffer = function(){
        var self = this;
        //in each negoiation, the party who make offer should be calling 
        this.ctyp = "calling";
        this.peer.createOffer(function(desc){
            console.log('makeOffer',desc);
            self.peer.setLocalDescription(desc);
            self.onSend('msg',{room:self.room, to:self.id, sdp:desc});
        }, null, null);
    };

    _proto.makeAnswer = function(){
        var self = this;
        //this.peer.setRemoteDescription(this.rmtSdp);
        this.peer.createAnswer(function(desc){
            console.log('makeAnswer');
            self.peer.setLocalDescription(desc);
            self.onSend('msg',{room:self.room, to:self.id, sdp:desc});
        },null);
        this.negostate = false;

    };

    _proto.addStream =  function(stream){
        this.peer.addStream(stream);
    };

    _proto.removeStream = function(stream){
        this.peer.removeStream(stream);
    };

    _proto.setRmtDesc = function(desc){
        var sdp = new RTCSessionDescription(desc);
        this.peer.setRemoteDescription(sdp);
        // if(this.negostate == false){
        //     this.peer.setRemoteDescription(sdp);
        // }
        console.log('setRemoteDescription ',sdp);
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
        if(this.dc.readyState != 'open'){
            console.log('Error','datachannel is not ready, could not send');
        }else{
            this.dc.send(data);
        }
    };

    _proto.getDcState =  function(){
        return this.dc.readyState == 'open';
    };

    _proto.callType = function(v){
        return (v == undefined)?this.ctyp : this.ctype = v; 
    };

    _proto.negoState = function(v){
        return (v == undefined)?this.negostate : this.negostate = v; 
    };


})();

module.exports = peerConn;

},{}],5:[function(require,module,exports){
// created by @HenrikJoreteg
var webrtcsupport;
(function(){
    var prefix;
    var version;

    if (window.mozRTCPeerConnection || navigator.mozGetUserMedia) {
        prefix = 'moz';
        version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
    } else if (window.webkitRTCPeerConnection || navigator.webkitGetUserMedia) {
        prefix = 'webkit';
        version = navigator.userAgent.match(/Chrom(e|ium)/) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);
    }

    var PC = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
    var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
    var MediaStream = window.webkitMediaStream || window.MediaStream;
    var screenSharing = window.location.protocol === 'https:' &&
        ((prefix === 'webkit' && version >= 26) ||
         (prefix === 'moz' && version >= 33))
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var videoEl = document.createElement('video');
    var supportVp8 = videoEl && videoEl.canPlayType && videoEl.canPlayType('video/webm; codecs="vp8", vorbis') === "probably";
    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia || navigator.mozGetUserMedia;

    // export support flags and constructors.prototype && PC
    var WebRtc = {
        prefix: prefix,
        browserVersion: version,
        support: !!PC && !!getUserMedia,
        // new support style
        supportRTCPeerConnection: !!PC,
        supportVp8: supportVp8,
        supportGetUserMedia: !!getUserMedia,
        supportDataChannel: !!(PC && PC.prototype && PC.prototype.createDataChannel),
        supportWebAudio: !!(AudioContext && AudioContext.prototype.createMediaStreamSource),
        supportMediaStream: !!(MediaStream && MediaStream.prototype.removeTrack),
        supportScreenSharing: !!screenSharing,
        // constructors
        AudioContext: AudioContext,
        PeerConnection: PC,
        SessionDescription: SessionDescription,
        IceCandidate: IceCandidate,
        MediaStream: MediaStream,
        getUserMedia: getUserMedia
    };

    webrtcsupport = WebRtc;

})();


module.exports = webrtcsupport;

},{}]},{},[3]);

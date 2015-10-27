(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
var PeerConn = require('./peerconn');

//constructor
function HubCom(options){
	var self = this;
	var opts = this.opts = options || {};
	var room = opts.hubName || 'foo';
	var user = opts.usrName || 'demo';
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
	this.usrList = [];
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
			var usr = self.usrList[from];
			self.onDataRecv(usr,data);
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

	
  socket.emit('join', {room:room,user:user});

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
			//delete self.usrList[index];
		}
	});

  //////////////handle the signal msg from otherside
	socket.on('msg', function (message){
		var id = message.from;
		var usr = message.usr;
		var index = getSockIdx(id);
		console.log('get index:', index);

		if(id>=0 && usr){
			self.usrList[id] = usr;
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


},{"./peerconn":3}],2:[function(require,module,exports){
'use strict';
var HubCom = require('./hubcom');

var sendButton = document.getElementById("sendButton");
var sendTextarea = document.getElementById("dataChannelSend");
var msgHistory = document.getElementById("msgHistory");

var mediaButton = document.getElementById("mediaButton");
var mediaArea = document.getElementById("mediaAreas");

var localAudio = document.querySelector('#localAudio');
var remoteAudio = document.querySelector('#remoteAudio');


var chatText = '';
var options = {};
/*pass local and remote audio element to hubcom*/
options.locAudio = localAudio;
options.remAudio = remoteAudio;

/*get userName*/
var user = prompt("Please enter your name","");
if(!user){
	user = 'demo'+Math.ceil(Math.random()*1000);
}

options.usrName = user;

var hubCom = new HubCom(options);

hubCom.onDCChange = hdlDCchange;
hubCom.onDataRecv = hdlDataRecv;
hubCom.onMediaAct =  hdlMedAct;
sendButton.onclick = sendData;
mediaButton.onclick = invokeMedia;

function enableMsgInf(enable) {
  if (enable) {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    dataChannelSend.placeholder = "";
    sendButton.disabled = false;
		mediaButton.disabled = false;
		
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
		mediaButton.disabled = true;
  }
}

enableMsgInf(false);

function addMsgHistory(data){
	chatText = '<p>'+data+'</p>' + chatText;
	
	msgHistory.innerHTML = chatText;
	//console.log('show message:',chatText);
}


function sendData() {
  var data = sendTextarea.value;
	if(data&&data!=''){
		hubCom.sendData(data);	
		addMsgHistory(user+': '+data);
	  console.log('Sent data: ' + data);
	}
	sendTextarea.value = '';
}


function hdlDCchange(state){
	enableMsgInf(state);

}


function hdlDataRecv(from, data) {
  console.log('Received message from ' + from + ' msg is: ' + data);
	addMsgHistory(from+': '+data);

}

function hdlMedAct(state){
	if(state){
		mediaButton.innerHTML = "Stop Broadcast"
	}else{
		mediaButton.innerHTML = "Start Broadcast"
	}
}

function invokeMedia(){
	if(hubCom.mediaActive == false){
		hubCom.startAudioCast();
	}else{
		hubCom.stopAudioCast();
	}
}

window.onbeforeunload = function(e){
	console.log('onbeforeunload');
}


},{"./hubcom":1}],3:[function(require,module,exports){
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

},{"./wildemitter":4}],4:[function(require,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {

});

emitter.on('somenamespace*', function (eventName, payloads) {

});

Please note that callbacks triggered by wildcard registered events also get
the event name as the first argument.
*/

module.exports = WildEmitter;

function WildEmitter() { }

WildEmitter.mixin = function (constructor) {
    var prototype = constructor.prototype || constructor;

    prototype.isWildEmitter= true;

    // Listen on the given `event` with `fn`. Store a group name if present.
    prototype.on = function (event, groupName, fn) {
        this.callbacks = this.callbacks || {};
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };

    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    prototype.once = function (event, groupName, fn) {
        var self = this,
            hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        function on() {
            self.off(event, on);
            func.apply(this, arguments);
        }
        this.on(event, group, on);
        return this;
    };

    // Unbinds an entire group
    prototype.releaseGroup = function (groupName) {
        this.callbacks = this.callbacks || {};
        var item, i, len, handlers;
        for (item in this.callbacks) {
            handlers = this.callbacks[item];
            for (i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i]._groupName === groupName) {
                    //console.log('removing');
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    };

    // Remove the given callback for `event` or all
    // registered callbacks.
    prototype.off = function (event, fn) {
        this.callbacks = this.callbacks || {};
        var callbacks = this.callbacks[event],
            i;

        if (!callbacks) return this;

        // remove all handlers
        if (arguments.length === 1) {
            delete this.callbacks[event];
            return this;
        }

        // remove specific handler
        i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        if (callbacks.length === 0) {
            delete this.callbacks[event];
        }
        return this;
    };

    /// Emit `event` with the given args.
    // also calls any `*` handlers
    prototype.emit = function (event) {
        this.callbacks = this.callbacks || {};
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item,
            listeners;

        if (callbacks) {
            listeners = callbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, args);
            }
        }

        if (specialCallbacks) {
            len = specialCallbacks.length;
            listeners = specialCallbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, [event].concat(args));
            }
        }

        return this;
    };

    // Helper for for finding special wildcard event handlers that match the event
    prototype.getWildcardCallbacks = function (eventName) {
        this.callbacks = this.callbacks || {};
        var item,
            split,
            result = [];

        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };

};

WildEmitter.mixin(WildEmitter);

},{}]},{},[2]);

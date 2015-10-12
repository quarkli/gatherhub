'use strict';

var sendButton = document.getElementById("sendButton");
var sendTextarea = document.getElementById("dataChannelSend");
var msgHistory = document.getElementById("msgHistory");

/*add two kind of event to handle wether channel is intiated or not*/
enableMessageInterface(false);
sendButton.onclick = sendData;


var chatText = new Array();

var pc_config = webrtcDetectedBrowser === 'firefox' ?
  {'iceServers':[{'url':'stun:23.21.150.121'}]} : // number IP
  {'iceServers': [{'url': 'stun:chi2-tftp2.starnetusa.net'}]};

var pc_constraints = {
  'optional': [
    {'DtlsSrtpKeyAgreement': true},
    {'RtpDataChannels': true}
  ]};

var p2pHdls = new Array();


var room = location.pathname.substring(1);


if (room === '') {
//  room = prompt('Enter room name:');
  room = 'foo';
} else {
  //
}

var socket = io.connect();

if (room !== '') {
  console.log('Create or join room', room);
  socket.emit('join', room);
}

function getSocketIndex(id){
	var i = 0;
	for(i=0;i<p2pHdls.length;i++){
		if((p2pHdls[i])&&(p2pHdls[i].id == id)){
			return i;
		}
	}
	return -1;
}

socket.on('joined', function (data){
  console.log('Another peer # '+data.id+ ' made a request to join room ' + room);
	// id = data.id has joined into the room, create pc to connect it.
	//create peerconnection
	var id = data.id;
	var index = getSocketIndex(id);
  console.log('get index:', index);
	var p2pNode = p2pHdls[index];
	if(!p2pNode){
		p2pNode = new PeerHdl();
		p2pNode.create(id,'calling');
		p2pHdls[p2pHdls.length] = p2pNode;
	}
	
	//create offer
	p2pNode.makeOffer();
	//add here temp
});

socket.on('bye',function(data){
  console.log('Another peer # '+data.id+ ' leave room ' + room);
	var id = data.id;
	var index = getSocketIndex(id);

	console.log('release index '+index+ ' resource' );

	if(index>=0){
		p2pHdls[index].close();
		delete p2pHdls[index];
	}
	
	
});



socket.on('msg', function (message){
	var id = message.from;
	var index = getSocketIndex(id);
  console.log('get index:', index);
	
	var p2pNode = p2pHdls[index];
  console.log('Received message:', message);
  if (message.sdp.type === 'offer') {
		//get invite from other side
		if(!p2pNode){
			p2pNode = new PeerHdl();
			p2pNode.create(id,'called');
			p2pHdls[p2pHdls.length] = p2pNode;
		}

		
    p2pNode.setRemoteDescription(new RTCSessionDescription(message.sdp));
		//make a offer
    p2pNode.makeAnswer();
		//add here temp
		
  } else if (message.sdp.type === 'answer' ) {
		if(!p2pNode){
			console.log("wrong answer id from "+id);
			return;
		}
    p2pNode.setRemoteDescription(new RTCSessionDescription(message.sdp));
		
  } else if (message.sdp.type === 'candidate') {
		if(!p2pNode){
			console.log("wrong candidate id from "+id);
			return;
		}
    var candidate = new RTCIceCandidate({sdpMLineIndex:message.sdp.label,
      candidate:message.sdp.candidate});
    p2pNode.addIceCandidate(candidate);
  } else if (message === 'bye' ) {
    //handleRemoteHangup();
  }
});



socket.on('log', function (array){
  console.log.apply(console, array);
});


function PeerHdl(){
	return {
		create : function(id,type){
			//add try catch(e) when needed.
			var self = this;
			this.id = id;
			this.connection = new RTCPeerConnection(pc_config, pc_constraints);
    	this.connection.onicecandidate = function(event){
			  console.log('handleIceCandidate event: ', event);
			  if (event.candidate) {
			    sendMessage({
						room: room,
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
			};
			if(type=='calling'){
				//add try catch(e) when needed.

	      this.sendChannel = this.connection.createDataChannel("sendDataChannel",{reliable: false});
			  console.log('sendChannel created!',this.sendChannel);
	      this.sendChannel.onmessage = handleMessage;
    		this.sendChannel.onopen = hdlDataChanSateChange;
    		this.sendChannel.onclose = hdlDataChanSateChange;
			}else{
    		this.connection.ondatachannel = function(event){
					trace('Receive Channel Callback');
					self.sendChannel = event.channel;
					self.sendChannel.onmessage = handleMessage;
	    		self.sendChannel.onopen = hdlDataChanSateChange;
	    		self.sendChannel.onclose = hdlDataChanSateChange;
				};
			}
		},

		
		makeOffer: function(){
			var self =this;
		  var constraints = {'optional': [], 'mandatory': {'MozDontOfferDataChannel': true}};
		  // temporary measure to remove Moz* constraints in Chrome
		  if (webrtcDetectedBrowser === 'chrome') {
		    for (var prop in constraints.mandatory) {
		      if (prop.indexOf('Moz') !== -1) {
		        delete constraints.mandatory[prop];
		      }
		     }
		   }
		  this.connection.createOffer(function(sdp){
			  self.connection.setLocalDescription(sdp);
			  sendMessage({room:room, to:self.id, sdp:sdp});
			}, null, constraints);
		},

		makeAnswer: function(){
		  console.log('Sending answer to peer.');
			var self =this;
		  this.connection.createAnswer(function(sdp){
			  self.connection.setLocalDescription(sdp);
			  sendMessage({room:room, to:self.id, sdp:sdp});
			},null);

		},
		
		setRemoteDescription: function(sdp){
			this.connection.setRemoteDescription(sdp);
		},
		addIceCandidate: function(candidate){
			this.connection.addIceCandidate(candidate);
		},
		close: function(){
		  console.log('peerconnection close');
			this.connection.close();
		}
	};
}




////////////////////////////////////////////////
//var name = prompt("What is your name?");

////////////////////////
function addMsgHistory(data){
	var message = '';
	var size = chatText.length;
	chatText[size] = '<li>'+data+'</li>';
	
	for(var i=0;i<chatText.length;i++){
		message+=chatText[i];
	}
	msgHistory.innerHTML = message;
	console.log('show message:',message);
}

//////////////////////////////

function sendMessage(message){
	console.log('Sending message: ', message);
  socket.emit('msg', message);
}



function handleUserMediaError(error){
  console.log('getUserMedia error: ', error);
}



window.onbeforeunload = function(e){
	//sendMessage('bye');
}



function sendData() {
  var data = sendTextarea.value;
	var p2pNode;
	
	p2pHdls.forEach(function(p2pNode){
		p2pNode.sendChannel.send(data);
	});
		
	addMsgHistory(data);
  trace('Sent data: ' + data);
}


function hdlDataChanSateChange(){
	var p2pNode;
	var state =false;
	p2pHdls.forEach(function(p2pNode){
		if(p2pNode.sendChannel.readyState=="open"){
			state = true;
			console.log("hdlDataChanSateChange event is ",state);
			return;
		}
	});
	enableMessageInterface(state);

}


function handleMessage(event) {
  trace('Received message: ' + event.data);
  //receiveTextarea.value = event.data;
	//msgTextarea.append(event.data);
	addMsgHistory(event.data);

}


function enableMessageInterface(shouldEnable) {
    if (shouldEnable) {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    dataChannelSend.placeholder = "";
    sendButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
  }
}


function mergeConstraints(cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional.concat(cons2.optional);
  return merged;
}


function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
      	console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
 // reattachMediaStream(miniVideo, localVideo);
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
//  waitForRemoteVideo();
}
function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  //sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  //isInitiator = false;
}

function stop() {
  // isAudioMuted = false;
  // isVideoMuted = false;
  //pc.close();
  //pc = null;
}

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}


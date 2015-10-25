'use strict';
var HubCom = require('./hubcom');

var sendButton = document.getElementById("sendButton");
var sendTextarea = document.getElementById("dataChannelSend");
var msgHistory = document.getElementById("msgHistory");

var mediaButton = document.getElementById("mediaButton");
var mediaArea = document.getElementById("mediaAreas");

var localAudio = document.querySelector('#localAudio');
var remoteAudio = document.querySelector('#remoteAudio');
var localStream = null;
var remoteStream = null;


var chatText = [];
var hubCom = new HubCom();

hubCom.onDCChange = hdlDCchange;
hubCom.onDataRecv = hdlDataRecv;
hubCom.muteLocMedia = stopMedia;
hubCom.onRStreamAdd = handleRemoteStreamAdded;
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
	var message = '';
	var size = chatText.length;
	chatText[size] = '<li>'+data+'</li>';
	
	for(var i=0;i<chatText.length;i++){
		message+=chatText[i];
	}
	msgHistory.innerHTML = message;
	console.log('show message:',message);
}





function sendData() {
  var data = sendTextarea.value;
	hubCom.sendData(data);	
	addMsgHistory(data);
  console.log('Sent data: ' + data);
}


function hdlDCchange(state){
	enableMsgInf(state);

}


function hdlDataRecv(from, data) {
  console.log('Received message from ' + from + ' msg is: ' + data);
	addMsgHistory(data);

}



////////////////////////////////////


function handleUserMedia(stream) {
  console.log('Adding local stream.',stream);
  localAudio.src = window.URL.createObjectURL(stream);
  localStream = stream;
	hubCom.addLocMedia(stream);
	
}

function handleUserMediaError(error){
  console.log('getUserMedia error: ', error);
	mediaStatus = false;

}

var constraints = {audio: true};

function muteMedia(){
	if(localStream){
 		localStream.getTracks().forEach(function(track) {
      track.stop();
    });
	}
}


function startMedia(){
	/*stop previous local medias*/
	muteMedia();
	//console.log("localStream is ",localStream);
	getUserMedia(constraints, handleUserMedia, handleUserMediaError);
	mediaStatus = true;
	mediaButton.innerHTML = "Stop Broadcast"

}

function stopMedia(){
	muteMedia();
	hubCom.rmLocMedia();
	mediaStatus = false;
	mediaButton.innerHTML = "Start Broadcast"
}

var mediaStatus = false;

function invokeMedia(){
	if(mediaStatus == false){
		startMedia();
	}else{
		stopMedia();
	}

}

function handleRemoteStreamAdded(stream) {
  console.log('Remote stream added.');
  attachMediaStream(remoteAudio, stream);
  remoteStream = stream;
}

window.onbeforeunload = function(e){
	console.log('onbeforeunload');
}


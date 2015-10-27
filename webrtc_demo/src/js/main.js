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


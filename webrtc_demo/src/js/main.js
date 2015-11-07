'use strict';
var HubCom = require('./hubcom');


var mediaButton = document.getElementById("mediaButton");

var localAudio = document.querySelector('#localAudio');
// var remoteAudio = document.querySelector('#remoteAudio');




var options = {};
/*pass local and remote audio element to hubcom*/
// options.locAudio = localAudio;
// options.remAudio = remoteAudio;
options.twoway = true;

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
    var mNode,au;
    mNode = {};
    mNode.id = 'rAudio'+medList.length;
    mNode.ln = "<audio id="+mNode.id+" autoplay></audio>"
    mNode.s = s;
    medList[medList.length] = mNode;
    $('.rStrmList').append(mNode.ln);
    au = document.querySelector('#'+mNode.id);
    attachMediaStream(au,s);
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


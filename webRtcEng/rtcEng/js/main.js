'use strict';
var TeleCom = require('./telecom');

var options = {room:'foo'};
/*pass local and remote audio element to teleCom*/
// options.locAudio = localAudio;
// options.remAudio = remoteAudio;

/*get userName*/
var user = prompt("Please enter your name","");
var user ;
if(!user){
	user = 'demo'+Math.ceil(Math.random()*1000);
}

options.user = user;

var teleCom = new TeleCom(options);


teleCom.onTextRecv = hdlTextMsg;
teleCom.onSpkrList = updateSpkrList;
teleCom.onUsrList = updateUsrList;
teleCom.onScnList = updateScnList;
teleCom.onWarnMsg = showWarnMsg;

teleCom.onMyAvAdd = hdlMyAvAdd;
teleCom.onFrAvAdd = hdlFarAvAdd;
teleCom.onFrAvRm = hdlFarAvRm;
teleCom.onAvState =  hdlAvState;

teleCom.onMyScnAdd = hdlMyScnAdd;
teleCom.onFrScnAdd = hdlFarScnAdd;
teleCom.onFrScnRm = hdlFarScnRm;
teleCom.onScnState = hdlScnState;

teleCom.login();


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
		teleCom.sendTxt2All(data);	
		addMsgHistory(user+': '+data,1);
    $('.message-input').val(''); 
	}
}


function hdlTextMsg(from, data) {
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

// Attach a media stream to an element.
function attachMediaStream (element, stream) {
  element.srcObject = stream;
}


function hdlMyAvAdd(s){
    var ln,m;
    if(s.getVideoTracks().length>0){
        ln = "<video id='localMed' autoplay muted></video>";
    }else{
        ln = "<audio id='localMed' autoplay muted></audio>";
    }

    $('.medAreas').append(ln);
    m = document.querySelector('#localMed');
    attachMediaStream(m,s);
}

function hdlMyAvRm(){
    $('#localMed').remove();
}


function hdlFarAvAdd(s){
    var ln,m;
    if(s.getVideoTracks().length>0){
        ln = "<video id='remoteMed' autoplay></video>";
    }else{
        ln = "<audio id='remoteMed' autoplay></audio>";
    }

    $('.medAreas').append(ln);
    m = document.querySelector('#remoteMed');
    attachMediaStream(m,s);
}

function hdlFarAvRm(s){
    $('#remoteMed').remove();
}

function hdlAvState(state){
	switch(state){
	case 'active':
		$('#medButton').html('Stop Media Cast'); 
		break;
	case 'pending':
		$('#medButton').html('Trying...Cancel?'); 
		break;
	case 'idle':
		$('#medButton').html('Start Media Cast');
		break;
	}
}

$('#medButton').click(function(event) {
    if(teleCom.getSpkrStatus() == 'idle'){
        var video = $('#enVideo').is(':checked');
        teleCom.startSpeaking(video);
    }else{
        teleCom.stopSpeaking();
        hdlMyAvRm();
    }
    event.preventDefault();
});

function updateSpkrList(l){
    var c = 0;
    $('#castingList').html('');
	l.forEach(function(d){
        if(c == 0){
            $('#castingList').append('<p>' + d + ' is talking now</p>') ;
        }else{
            $('#castingList').append('<p>' + d + ' waits to talk</p>') ;
        }
        c++;
	});
}

function hdlMyScnAdd(s){
    var ln,m;
    ln = "<video id='localScn' autoplay muted></video>";
    $('.scnAreas').append(ln);
    m = document.querySelector('#localScn');
    attachMediaStream(m,s);
}
function hdlMyScnRm(){
    $('#localScn').remove();
}

function hdlFarScnAdd(s){
    var ln,m;
    ln = "<video id='remoteScn' autoplay></video>";
    $('.scnAreas').append(ln);
    m = document.querySelector('#remoteScn');
    attachMediaStream(m,s);
}

function hdlFarScnRm(s){
    $('#remoteScn').remove();
}

function updateScnList(l){
    var c = 0;
    $('#scnCastList').html('');
    l.forEach(function(d){
        if(c == 0){
            $('#scnCastList').append('<p>' + d + ' is casting his screen</p>') ;
        }else{
            $('#scnCastList').append('<p>' + d + ' waits to do screen cast</p>') ;
        }
        c++;
    });
}

$('#scnButton').click(function(event) {
    if(teleCom.getScnStatus() == 'idle'){
        teleCom.startscnCast();
    }else{
        teleCom.stopscnCast();
        hdlMyScnRm();
    }
    event.preventDefault();
});


function hdlScnState(state){
    switch(state){
    case 'active':
        $('#scnButton').html('Stop Screen Cast'); 
        break;
    case 'pending':
        $('#scnButton').html('Waiting...Cancel?'); 
        break;
    case 'idle':
        $('#scnButton').html('Start Screen Cast');
        break;
    }
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

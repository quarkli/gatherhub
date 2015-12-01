
var adapter = require('webrtc-adapter-test');
var getUserMedia = adapter.getUserMedia;
var pc1, pc2, gstream, _browser, _rtpSender;
var config = {

    ice : {
        iceServers : [{'url': 'stun:chi2-tftp2.starnetusa.net'}]
    },
    peerConstrs : {
        optional : [
            {'DtlsSrtpKeyAgreement': true}
        ]
    },
    recvMedia :{
        mandatory: {
            OfferToReceiveVideo:true, 
            OfferToReceiveAudio:true
        }
    },
    videoConstrs : {audio: true, video: false}

};

_browser = adapter.webrtcDetectedBrowser;
_rtpSender = [];

pc1 = RTCPeerConnection(config.ice, config.peerConstrs);
pc2 = RTCPeerConnection(config.ice, config.peerConstrs);

function attachMediaStream (element, stream) {
  element.srcObject = stream;
}

function addLocMedia(s){
    var ln,m;
    if(s.getVideoTracks().length>0){
        ln = "<video id='localMed' autoplay></video>";
    }else{
        ln = "<audio id='localMed' autoplay></audio>";
    }
    ln = "<audio id='localMed' autoplay></audio>";

    $('.medAreas').append(ln);
    m = document.querySelector('#localMed');
    attachMediaStream(m,s);
}

function rmLocMedia(){
    $('#localMed').remove();
}


pc2.onaddstream = function(e){
    var s,ln,m;
    s =e.stream;
    if(s.getVideoTracks().length>0){
        ln = "<video id='remoteMed' autoplay></video>";
    }else{
        ln = "<audio id='remoteMed' autoplay></audio>";
    }

    $('.medAreas').append(ln);
    m = document.querySelector('#remoteMed');
    attachMediaStream(m,s);
};

pc2.onremovestream = function(s){
    $('#remoteMed').remove();
};

function startMedia(){
    _rtpSender = [];
    getUserMedia(config.videoConstrs, function(stream){
        gstream = stream;
        addLocMedia(stream);
        if(_browser == 'firefox'){
            stream.getTracks().forEach(function(t){
                console.log('add track ',t);
                _rtpSender.push(pc1.addTrack(t,stream));
            });
        }else{
            pc1.addStream(stream);
        }
        pc1.createOffer(function(desc){
            pc1.setLocalDescription(desc);
            pc2.setRemoteDescription(desc);
            pc2.createAnswer(function(desc1){
                pc1.setRemoteDescription(desc1);
            },function(){
                console.log('answer error');
            });
        },function(){
            console.log('offer error');
        },config.recvMedia);

    },function(){
        console.log('get media error');
    });
}

function stopMedia(){
    var s = gstream;
    s.getTracks().forEach(function(t){t.stop()});
    if(_browser == 'firefox'){
        _rtpSender.forEach(function(t){
            console.log('remove track ',t);
            try{
                pc1.removeTrack(t);
            }catch(err){
                console.log(err.name,err.message);
            }
        });
    }else{
        pc1.removeStream(s);
    }
    pc1.createOffer(function(desc){
        pc1.setLocalDescription(desc);
        pc2.setRemoteDescription(desc);
        pc2.createAnswer(function(desc1){
            pc1.setRemoteDescription(desc1);
        },function(){
            console.log('answer error');
        });
    }, function(){
        console.log('offer error2');
    },config.recvMedia);
}

$('#t1Button').click(function(event) {
    startMedia();
    event.preventDefault();
});

$('#t2Button').click(function(event) {
    stopMedia();
    rmLocMedia();
    event.preventDefault();
});
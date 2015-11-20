'use strict';
var adapter = require('webrtc-adapter-test');
var peerConn;

(function(){
    var _proto;

    //constructors
    function PeerConn(opts){
        var self, options, item;
        options = opts || {};
        this.config = {
            ice : {
                iceServers : [{'url': 'stun:chi2-tftp2.starnetusa.net'}]
            },
            peerConstrs : {
                optional : [
                    {'DtlsSrtpKeyAgreement': true}
                    // {'RtpDataChannels': true}
                ]
            },
            recvMedia :{
                mandatory: {OfferToReceiveVideo:true, OfferToReceiveAudio:true}
            },
            room: 'default',
            type: '',
            id: 0
        };

        for(item in options){
            this.config[item] = options[item];
        }

        self = this;
        this.peer =  RTCPeerConnection(this.config.ice, this.config.peerConstrs);

        this.peer.onicecandidate = onIce;
        this.peer.onaddstream = onRStrmAdd;
        this.peer.onremovestream = onRStrmRm;
        this.ctyp = this.config.type;
        this.rmtStrms = [];
        this.locStrms = [];

        //internal methods
        function onIce(event){
          console.log('onIce: ', event);
          if (event.candidate) {
            self.onSend('msg',{
                    room: self.config.room,
                    to: self.config.id,
                    sdp: {
                  type: 'candidate',
                  label: event.candidate.sdpMLineIndex,
                  id: event.candidate.sdpMid,
                  candidate: event.candidate.candidate},
                    });
          } else {
            console.log('End of candidates.');
            // if(self.ctyp == 'calling' && self.dc &&self.dc.readyState != 'open'){
            //     self.onConError(self.config.id);
            // }
          }
        }

        function onDcSetup(event){
            console.log('Receive Channel:',event.channel);
            self.dc = event.channel;
            self.dc.onmessage = onRecv;
            self.dc.onopen = onDcState;
            self.dc.onclose = onDcState;
        }

        function onRStrmAdd(event){
            var s = event.stream;
            self.onAddRStrm(s);
            self.rmtStrms.push(s);
        }

        function onRStrmRm(event){
            var s =event.stream;
            self.onRmRStrm(s);
            self.rmtStrms.splice(self.rmtStrms.indexOf(s),1);
        }
        function onDcState(){
            var s ;
            console.log('info ','datachannel state is '+self.dc.readyState);
            s = (self.dc.readyState == 'open');
            self.onConnReady(s);
        }
        function onRecv(event){
          console.log('onRecv: ', event.data);
            self.onDcRecv(self.config.id,event.data);
        }


        if(this.config.type=='calling'){
            this.dc = this.peer.createDataChannel("data",{});
            console.log('sendDataChannel created!',this.dc);
            this.dc.onmessage = onRecv;
            this.dc.onopen = onDcState;
            this.dc.onclose = onDcState;
        }else{
            this.peer.ondatachannel = onDcSetup;
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
    _proto.onConnReady = function(){};
    _proto.onConError = function(){};

 
    var mediaConstraints = {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: false
            }
        };        

    //api method

    _proto.makeOffer = function(){
        var self = this;
        //in each negoiation, the party who make offer should be calling 
        this.ctyp = "calling";
        this.peer.createOffer(function(desc){
            /*it is very strange that createoffer would generate sendonly media when local stream is mute
            from my mind, it should be a=recevonly */
            // var sdp = self.prePrcsSdp(desc.sdp);
            // desc.sdp = sdp;
            console.log('makeOffer ',desc);
            self.peer.setLocalDescription(desc);
            self.onSend('msg',{room:self.config.room, to:self.config.id, sdp:desc});
        }, function(err){
            console.log('offer Error',err);
        }, mediaConstraints);
    };

    _proto.makeAnswer = function(){
        var self = this;
        //this.peer.setRemoteDescription(this.rmtSdp);
        this.ctyp = "called";
        this.peer.createAnswer(function(desc){
            // var sdp = self.prePrcsSdp(desc.sdp);
            // desc.sdp = sdp;
            console.log('makeAnswer ',desc);
            self.peer.setLocalDescription(desc);
            self.onSend('msg',{room:self.config.room, to:self.config.id, sdp:desc});
        },function(err){
            console.log('answer Error',err);
        },mediaConstraints);
    };

    _proto.addStream =  function(stream){
        this.peer.addStream(stream);
        this.locStrms.push(stream);
    };

    _proto.removeStream = function(stream){
        this.peer.removeStream(stream);
        this.locStrms.splice(this.locStrms.indexOf(stream),1);
    };

    _proto.setRmtDesc = function(desc){
        var sdp = new RTCSessionDescription(desc);
        this.peer.setRemoteDescription(sdp);
        console.log('setRemoteDescription ',sdp);
    };

    _proto.addIceCandidate = function(candidate){
        this.peer.addIceCandidate(candidate);
        console.log('addIceCandidate ',candidate);
    };

    _proto.close = function(){
        console.log('peerConnection close ',this.config.id);
        this.peer.close();
    };

    _proto.getId = function(){
        return this.config.id;
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

    _proto.isRmtAudOn = function(){
        var rc = false;
        this.rmtStrms.forEach(function(s){
            if(s.getAudioTracks().length > 0){
                rc =true;
            }
        });
        return rc;
    };

    /*some other functions*/
    _proto.prePrcsSdp = function(sdp){
        var auOn, scOn, sdps, nwSdp, cnt;
        auOn = false, scOn =false;
        this.locStrms.forEach(function(s){
            if(s.getAudioTracks().length > 0)auOn = true;
            if(s.getVideoTracks().length > 0)scOn = true;
        });
        nwSdp = '';
        sdps = sdp.split('m=');
        cnt = 0;
        console.log('parse sdp ','audio = '+auOn+' video = '+scOn);
        sdps.forEach(function(d){
            var ss;
            ss = (cnt > 0)? 'm=' + d : d;
            cnt ++;
            if(auOn == false && ss.search('m=audio')>=0){
                ss = ss.replace(/a=sendonly/g,'a=recvonly');
            }
            if(scOn == false && ss.search('m=video')>=0){
                ss = ss.replace(/a=sendonly/g,'a=recvonly');
            }
            nwSdp += ss;
        });
        return nwSdp;
    };




})();

module.exports = peerConn;

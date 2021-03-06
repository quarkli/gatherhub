'use strict';
var adapter = require('webrtc-adapter-test');
var peerConn;

(function(){
    var _proto, _debug, _browser;
    _browser = adapter.webrtcDetectedBrowser;

    _debug = false;

    //constructors
    function PeerConn(opts){
        var self, options, item;
        options = opts || {};
        this.config = {
            ice : {
                // iceServers : [{'url': 'stun:chi2-tftp2.starnetusa.net'}]
                iceServers : [
                    {'url': 'stun:chi2-tftp2.starnetusa.net'},
                    {'url': 'stun:stun01.sipphone.com'},
                    {'url': 'stun:stun.fwdnet.net'},
                    {'url': 'stun:stun.voxgratia.org'},
                    {'url': 'stun:stun.xten.com'}
                ]
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
            room: 'default',
            type: '',
            id: 0
        };

        for(item in options){
            this.config[item] = options[item];
        }

        self = this;
        try{
            this.peer =  RTCPeerConnection(this.config.ice, this.config.peerConstrs);
        }catch(e){
            console.log(e.name);
            return;
        };

        this.peer.onicecandidate = onIce;
        this.peer.onaddstream = onRStrmAdd;
        this.peer.onremovestream = onRStrmRm;
        this.peer.ondatachannel =  this.hdlDatChanAdd.bind(this);
        this.ctyp = this.config.type;
        this.rmtStrms = [];
        this.locStrms = [];
        this.rtpTracks = [];
        this.datChans = {};
        this.ready =  false;

        //internal methods
        function onIce(event){
          if(_debug)console.log('onIce: ', event);
          if (event.candidate) {
            self.onCmdSend('msg',{
                    to: self.config.id,
                    mid: self.config.mid,
                    sdp: {
                  type: 'candidate',
                  label: event.candidate.sdpMLineIndex,
                  id: event.candidate.sdpMid,
                  candidate: event.candidate.candidate},
                    });
          } else {
            if(_debug)console.log('End of candidates.');
            // setTimeout(function(){
            //     if(self.ready == false){
            //         self.onConError('default',self.config.id);
            //     }
            // }, 5000);
          }
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

    }

    //export obj
    peerConn = PeerConn;

 
    //prototype
    _proto = PeerConn.prototype ;
    //cb functions
    _proto.onCmdSend = function(){};
    _proto.onDcRecv = function(){};
    _proto.onAddRStrm = function(){};
    _proto.onRmRStrm = function(){};
    _proto.onConnReady = function(){};
    _proto.onConError = function(){};

    //api method
    _proto.makeOffer = function(opts){
        var self = this;
        var constrains = opts || this.config.recvMedia;
        this.ctyp = "calling";
        this.peer.createOffer(function(desc){
            /*it is very strange that createoffer would generate sendonly media when local stream is mute
            from my mind, it should be a=recevonly */
            var sdp = self.prePrcsSdp(desc.sdp);
            desc.sdp = sdp;
            if(_debug)console.log('makeOffer ',desc);
            self.peer.setLocalDescription(desc);
            self.onCmdSend('msg',{
                to:self.config.id, 
                mid:self.config.mid,
                oneway:self.config.oneway,
                sdp:desc
            });
        }, function(err){
            console.log('offer Error',err);
        }, constrains);
    };

    _proto.makeAnswer = function(opts){
        var self = this;
        var constrains = opts || this.config.recvMedia;
        this.ctyp = "called";
        this.peer.createAnswer(function(desc){
            var sdp = self.prePrcsSdp(desc.sdp);
            desc.sdp = sdp;
            if(_debug)console.log('makeAnswer ',desc);
            self.peer.setLocalDescription(desc);
            self.onCmdSend('msg',{
                to:self.config.id,
                mid: self.config.mid,
                sdp:desc
            });
        },function(err){
            console.log('answer Error',err);
        },constrains);
    };

    _proto.addStream =  function(stream){
        var self = this;
        if(_browser == 'firefox'){
            this.rtpTracks = [];
            stream.getTracks().forEach(function(t){
                self.rtpTracks.push(self.peer.addTrack(t,stream));
            });
        }else{
            this.peer.addStream(stream);            
        }        
        this.locStrms.push(stream);

    };

    _proto.removeStream = function(stream){
        var self = this;
        if(_browser == 'firefox'){
            stream.stop();
            this.rtpTracks.forEach(function(t){
                // FIXME: FF could not support mulit negotiation
                try{
                    self.peer.removeTrack(t);
                }catch(err){
                    console.log('remove track err ', err);
                };
            });
        }else{
            this.peer.removeStream(stream);            
        }
        this.locStrms.splice(this.locStrms.indexOf(stream),1);
    };

    _proto.setRmtDesc = function(desc){
        var sdp = new RTCSessionDescription(desc);
        this.peer.setRemoteDescription(sdp);
        if(_debug)console.log('setRemoteDescription ',sdp);
    };

    _proto.addIceCandidate = function(candidate){
        this.peer.addIceCandidate(candidate);
        if(_debug)console.log('addIceCandidate ',candidate);
    };

    _proto.close = function(){
        if(_debug)console.log('peerConnection close ',this.config.id);
        this.peer.close();
    };

    _proto.getId = function(){
        return this.config.id;
    };

    _proto._obsrvDatChan = function(ch){
        var self = this;
        ch.onclose = function(){
            if(_debug)console.log('dc chan close ',ch);
        };
        ch.onerror = function(){
            console.log('dc chan erro ',ch);
            self.onConError(ch.label,self.config.id);
        };
        ch.onopen =  function(){
            if(_debug)console.log('dc chan open ',ch);
            console.log('dc chan open ',ch);
            self.ready = true;
            self.onConnReady(ch.label,self.config.id);
        };
        ch.onmessage = function(ev){
            // if(_debug)console.log('peer recv '+ch.label,ev.data);
            if(ch.label=='castCtrl0')console.log('peer recv '+ch.label,ev.data);
            self.onDcRecv(ch.label,self.config.id,ev.data);
        };
    };
    _proto.getDatChan = function(name,opts){
        var chan = this.datChans[name];
        if(!opts) opts = {};
        if(chan) return chan;
        if(this.ctyp == 'calling'){
            chan = this.datChans[name] = this.peer.createDataChannel(name,opts);
            this._obsrvDatChan(chan);
        }
        return chan;
    };
    _proto.hdlDatChanAdd = function(ev){
        var ch = ev.channel;
        this.datChans[ch.label] = ch;
        this._obsrvDatChan(ch);
    };

    _proto.sendData = function(chan,data){
        var dc = this.getDatChan(chan);
        if(!dc || (dc.readyState != 'open')){
            console.log('Error','channel '+dc+' is not ready, could not send');
        }else{
            if(dc.label=='castCtrl0')console.log('send ',data);
            dc.send(data);
        }
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
        if(_debug)console.log('parse sdp ','audio = '+auOn+' video = '+scOn);
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

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
        this.ctype = options.type;

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
            if(self.ctype == 'calling' && self.dc.readyState != 'open'){
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
        this.peer.createOffer(function(desc){
            console.log('makeOffer',desc);
            self.peer.setLocalDescription(desc);
            self.onSend('msg',{room:self.room, to:self.id, sdp:desc});
        }, null, null);
    };

    _proto.makeAnswer = function(){
        var self = this;
        this.peer.createAnswer(function(desc){
            console.log('makeAnswer');
            self.peer.setLocalDescription(desc);
            self.onSend('msg',{room:self.room, to:self.id, sdp:desc});
        },null);

    };

    _proto.addStream =  function(stream){
        this.peer.addStream(stream);
    };

    _proto.removeStream = function(stream){
        this.peer.removeStream(stream);
    };

    _proto.setRemoteDescription = function(desc){
        this.peer.setRemoteDescription(desc);
        console.log('setRemoteDescription ',desc);
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


})();

module.exports = peerConn;

/* 
* @Author: Phenix Cai
* @Date:   2015-11-13 19:14:00
* @Last Modified time: 2015-11-30 22:18:30
*/

'use strict';
var localMedia =  require('./localmedia');
var peerConn = require('./peerconn');


var webRtc;
(function(){
    var _proto, _dbgFlag;
    _dbgFlag = true;
    function _infLog(){
        if(_dbgFlag){
            console.log.apply(console, arguments);
        }
    }

    function _errLog(){
        console.log.apply(console, arguments);
    }
    

    function WebRtc(opts){
        
        var options, item, self, tmpId, cn;
        self = this;
        options = opts || {};
        tmpId = Math.ceil(Math.random()*1000);

        this.config = {
            room : 'default',
            user : 'demo'+tmpId,
            oneway : true
        }; 
        this.peers = [];

        for(item in options){
            this.config[item] = options[item];
        }

        this.media =  new localMedia(this.config); 

        this.datChRecvCb = {};
        this.datChRecvCb['textMsg'] = this._onDatRecv.bind(this);

    }
    // export obj
    webRtc = WebRtc;
    _proto = WebRtc.prototype;

    //parse signal messages from other peers
    _proto.parseSigMsg = function (msg){
        var id, pc, candidate;
        id = msg.from;
        pc = this.peers[id];
        // _infLog('Received msg:', msg);

        if (msg.sdp.type === 'offer') {
            //get invite from other side
            this._createPeer('called',id,msg.sdp);
            
        } else if (msg.sdp.type === 'answer' ) {
            if(!pc){
                _errLog("wrong answer id from "+id);
                return;
            }
          pc.setRmtDesc(msg.sdp);
            
        } else if (msg.sdp.type === 'candidate') {
            if(!pc){
                _errLog("wrong candidate id from "+id);
                return;
            }
          candidate = new RTCIceCandidate({sdpMLineIndex:msg.sdp.label,
            candidate:msg.sdp.candidate});
          pc.addIceCandidate(candidate);
        } 
    };


    _proto.addPartener = function(id){
        this._createPeer('calling',id,null);
    };

    _proto.rmPartener = function(id){
        this._removePeer(id);
    };

    _proto.sendData = function(chan,data){
        this.peers.forEach(function(pc){
            if(pc)pc.sendData(chan, data);
        });
    };

    _proto.useVideo =function(b){
        this.config.videoCast = b;
    };
    _proto.startMedia =  function(onSuc,onErr){
        var self, cs;
        self = this;
        if(this.config.videoCast) cs = {video: true, audio: true};
        this.media.start(cs, function(err,s){
            if(!err){
                if(onSuc)onSuc(s);
                self.onLMedAdd(s);
                self.peers.forEach(function(pc){
                    pc.addStream(s);
                    pc.makeOffer();
                });
            }else{
                if(onErr)onErr(err);
            }
        })
    };
    _proto.stopMedia = function(){
        var self = this;
        this.media.stop(function(s){
            self.peers.forEach(function(pc){
                pc.removeStream(s);
                pc.makeOffer();
            });
        });
    };
    _proto.startScreen = function(onSuc,onErr){
        var self = this;
        this.media.getScn(function(err,s){
            if(!err){
                if(onSuc)onSuc(s);
                self.onLMedAdd(s);
                self.peers.forEach(function(pc){
                    pc.addStream(s);
                    pc.makeOffer();
                });
            }else{
                if(onErr)onErr(err);
            }
        });
    };
    _proto.stopScreen = function(){
        var self = this;
        this.media.rlsScn(function(s){
            _infLog('rls ',s);
            self.peers.forEach(function(pc){
                pc.removeStream(s);
                pc.makeOffer();
            });
        });
    };

    _proto.sendTxt2All = function(data){
        // console.log('sendTxt2All ',data);
        this.sendData('textMsg',data);
    }; 

    _proto.createDataChan = function(label,onRecv){
        this.datChRecvCb[label] = onRecv.bind(this);
        
        this.peers.forEach(function(p){
            p.getDatChan(label);
        });

    };

    _proto.myId = function(v){
        return (v==undefined)? this._myId : this._myId = v;
    };

    /*some callback fuctions*/
    _proto.onCmdSend = function(){};
    _proto.onTextRecv = function(){};
    _proto.onLMedAdd = function(){};
    _proto.onRMedAdd = function(){};
    _proto.onRMedDel = function(){};
    _proto.onCrpErro = function(){};

    // internal APIs

    _proto._onChansReady = function(){};
    _proto._onDatRecv = function(f,d){
        this.onTextRecv(f,d);
    };

    //internal api for webrtc
    //register callback functions for peerconnections
    _proto._regPconnEvtCb = function(pc){
        var self = this;
        pc.onCmdSend = function(h,d){
            self.onCmdSend(h,d);
        };
        pc.onDcRecv = function (chan,from,data){
            var hdlData = self.datChRecvCb[chan];
            if(hdlData)hdlData(from,data);
        };
        pc.onAddRStrm = function (s){
            self.onRMedAdd(s);
        };
        pc.onRmRStrm = function(s){
            _infLog('rmtStrmDel',s);
            self.onRMedDel(s);
        };
        pc.onConError = function(label,id){
            var config = self.config;
            _errLog('peer',id+' connect error');
            removePeer(id);
            config.type = 'calling';
            config.id = id;
            self.onCrpErro(config);
        };
        pc.onConnReady = function(label,id){
            var ready = true;
            self.peers.forEach(function(p){
                if(p.ready == false) ready = false;
            });
            if(ready)self._onChansReady();
        }
    };

    function isSdpWithAudio(s){
        var sdps,idx,sdp,ret;
        ret = false;
        sdps =s.split('m=');
        sdps.forEach(function(d){
            sdp = 'm=' +d;
            idx = sdp.search('m=audio');
            if(idx >=0){
                if(sdp.slice(idx).search('a=sendrecv')>=0){
                    ret = true;
                    return;
                }
            }
        });
        return ret;
    }

    _proto._createPeer = function(type,id,sdp){
        var pc,config;
        config = this.config;
        config.id = id;
        config.type = type;

        pc = this.peers[id];
        if(!pc){
            pc = new peerConn(config);
            this.peers[id] = pc;
            this._regPconnEvtCb(pc);
        }
        if(type == 'calling'){
            this.media.getStrms().forEach(function(s){
                if(s)pc.addStream(s);
            });
            pc.getDatChan('textMsg');
            pc.makeOffer();
        }else{
            // received offer 
            pc.setRmtDesc(sdp);
            if(config.oneway == false){
                if(isSdpWithAudio(sdp.sdp)){
                    _infLog('offered with audio active');
                    this.media.start(function(err,s){
                        if(!err){
                            this.onLMedAdd(s);
                            pc.addStream(s);
                            pc.makeAnswer();
                        }else{
                            _errLog('start media Error',err);
                        }
                    });
                }else{
                    _infLog('offered with audio mute');
                    this.media.stop(function(s){
                        if(s)pc.removeStream(s);
                        pc.makeAnswer();
                    });
                }
            }else{
                pc.makeAnswer();
            }

        }

    };

    _proto._removePeer = function(id){
        var pc;
        pc = this.peers[id];
        if(pc){
            pc.close();
            delete this.peers[id];
        }
    };



})();

module.exports = webRtc;


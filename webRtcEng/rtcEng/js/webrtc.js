/* 
* @Author: Phenix Cai
* @Date:   2015-11-13 19:14:00
* @Last Modified time: 2015-11-26 19:39:14
*/

'use strict';
var localMedia =  require('./localmedia');
var sockConnection = require('./sockconn');
var rtc = require('webrtcsupport');
var peerConn = require('./peerconn');

var webRtc;
(function(){
    var _proto, _dbgFlag;
    _dbgFlag = false;
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
        cn = this.connt = new sockConnection(this.config);
        this.online = false;
        // user list keep the socket id list of all peers
        this.usrList = [];

        this.datChRecvCb = {};
        this.datChRecvCb['textMsg'] = this._onTextRecv.bind(this);

        //internal api for webrtc
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


        
        //register callback functions for peerconnections
        function regPconnEvtCb(pc){
            pc.onSend = function(){
                self.connt.emit.apply(self.connt,arguments);
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
        }


        function createPeer(type,id,sdp){
            var pc,config;
            config = self.config;
            config.id = id;
            config.type = type;
            if(!rtc.support){
                self.onCrpErro(config);
            }
            pc = self.peers[id];
            if(!pc){
                pc = new peerConn(config);
                self.peers[id] = pc;
                regPconnEvtCb(pc);
            }
            if(type == 'calling'){
                self.media.getStrms().forEach(function(s){
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
                        self.media.start(function(err,s){
                            if(!err){
                                self.onLMedAdd(s);
                                pc.addStream(s);
                                pc.makeAnswer();
                            }else{
                                _errLog('start media Error',err);
                            }
                        });
                    }else{
                        _infLog('offered with audio mute');
                        self.media.stop(function(s){
                            if(s)pc.removeStream(s);
                            pc.makeAnswer();
                        });
                    }
                }else{
                    pc.makeAnswer();
                }

            }

        };

        function removePeer(id){
            var pc;
            pc = self.peers[id];
            if(pc){
                pc.close();
                delete self.peers[id];
            }
        }
        //parse signal messages from other peers
        function parseSigMsg(msg){
            var id, usr, pc, candidate;
            id = msg.from;
            usr = msg.usr;
            pc = self.peers[id];
            _infLog('Received msg:', msg);
            if(id>=0 && usr){
                self.usrList[id] = usr;
                self.onUsrList(self.usrList);
            }

            if (msg.sdp.type === 'offer') {
                //get invite from other side
                createPeer('called',id,msg.sdp);
                
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
        }

        function regSigCallback(){
            cn.on('connected', function (data){
                _infLog('userid is ', data.id);
                self.config.usrId = data.id;
                self.online = true;
            });
            cn.on('joined', function (data){
                var config =self.config;
                _infLog('Another peer # '+data.id+ ' made a request to join room ' + config.room);
                if(rtc.support && data.rtc){
                    //create peerconnection
                    createPeer('calling',data.id,null);
                }else{
                    config.type = 'calling';
                    config.id = data.id;
                    self.onCrpErro(config);
                }
            });
            cn.on('msg', function (data){
                parseSigMsg(data);
            });
            cn.on('bye',function(data){
                _infLog('Another peer # '+data.id+ ' leave room ' + self.config.room);
                var id = data.id;

                delete self.usrList[id];
                self.onUsrList(self.usrList);
                removePeer(id);
            });
            /////////////// log from server
            cn.on('log', function (array){
              console.log.apply(console, array);
            });

        }
        regSigCallback();

    }
    // export obj
    webRtc = WebRtc;
    _proto = WebRtc.prototype;

    _proto.login = function(){
        var c = this.config;
        if(!this.online){
            this.connt.emit('join', {room:c.room,user:c.user,rtc:rtc.support});
        }
    };
    _proto.logout = function(){
        if(this.online){
            this.connt.emit('bye',{room:this.config.room});
        }
    };
    _proto.sendData = function(chan,data){
        this.peers.forEach(function(pc){
            if(pc)pc.sendData(chan, data);
        });
    };
    _proto.startMedia =  function(onSuc,onErr){
        var self = this;
        this.media.start(function(err,s){
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
    _proto.startScnShare = function(onSuc,onErr){
        var self = this;
        this.media.getScn(function(err,s){
            if(!err){
                if(onSuc)onSuc(s);
                self.peers.forEach(function(pc){
                    pc.addStream(s);
                    pc.makeOffer();
                });
            }else{
                if(onErr)onErr(err);
            }
        });
    };
    _proto.stopScnShare = function(){
        var self = this;
        this.media.rlsScn(function(s){
            _infLog('rls ',s);
            self.peers.forEach(function(pc){
                pc.removeStream(s);
                pc.makeOffer();
            });
        });
    };

    _proto.isRmtAudOn = function(){
        var rc = false;
        this.peers.forEach(function(p){
            if(p.isRmtAudOn()) rc = true;
        });
        return rc;
    };

    _proto.sendTxt2All = function(data){
        this.sendData('textMsg',data);
    }; 

    _proto.createDataChan = function(label,onRecv){
        this.datChRecvCb[label] = onRecv.bind(this);
        
        this.peers.forEach(function(p){
            p.getDatChan(label);
        });

    };

    /*some callback fuctions*/
    _proto.onTextRecv = function(){};
    _proto.onLMedAdd = function(){};
    _proto.onRMedAdd = function(){};
    _proto.onRMedDel = function(){};
    _proto.onCrpErro = function(){};
    _proto.onUsrList = function(){};

    // internal APIs

    _proto._onTextRecv = function(from, data){
        var usr = this.usrList[from];
        this.onTextRecv(usr,data);
    };
    
    _proto._onChansReady = function(){};


})();

module.exports = webRtc;


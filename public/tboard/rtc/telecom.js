/* 
* @Author: Phenix
* @Date:   2015-11-27 09:26:39
* @Last Modified time: 2015-12-02 12:55:49
*/

'use strict';
var medCast = require('./mediacast');
var sockConnection = require('./sockconn');
var rtc = require('webrtcsupport');
var adapter = require('webrtc-adapter-test');

var extrChan;
(function(){
    var _proto;
    function ExtrChan(config){
        var self = this;
        this.datChCbs = {};
        this.parteners = [];
        this.config = config;
        this.datChCbs['txt'] = function(msg){
            self.onTextRecv(msg.from,msg.data);
        };
    }
    _proto = ExtrChan.prototype;
    extrChan = ExtrChan;
    _proto.createDataChan = function(label,onRecv){
        this.datChCbs[label] = onRecv;
    };
    _proto.addPartener = function(id){
        var p = this.parteners[id];
        if(p) return;
        this.parteners[id] = id;
        this.onSend('msg',{
            room: this.config.room,
            to: id,
            mid: 0,
            sdp:{type:'exlnk'}
        });

    };
    _proto.rmPartener = function(id){
        var idx;
        idx = this.parteners.indexOf(id);
        if(idx>=0) this.parteners.splice(idx,1);        
    };
    _proto.sendData = function(chan,data){
        var self, msg;
        self = this;
        this.parteners.forEach(function(id){
            msg = {
                room: self.config.room,
                to: id,
                label: chan,
                data: data
            };
            self.onSend('dat',msg);
        });
    };
    _proto.sendTxt2All = function(data){
        this.sendData('txt',data);
    };
    _proto.hdlRecv = function(msg){
        var self, hdl;
        hdl = this.datChCbs[msg.label];
        if(hdl)hdl(msg);
    };
    _proto.onSend = function(){};
    _proto.onTextRecv = function(){};

})();

var teleCom;
(function(){
    var _proto, _dbgFlag, _browser;
    _dbgFlag = false;
    _browser = adapter.webrtcDetectedBrowser;
    function _infLog(){
        if(_dbgFlag){
            console.log.apply(console, arguments);
        }
    }

    function _errLog(){
        console.log.apply(console, arguments);
    }

    function checkCastSupport(){
        var info, rc;
        rc = false;
        switch(_browser){
            case 'firefox':
            info = 'Firefox could only receive audio/video/screen casting';
            break;
            case 'chrome':
            rc = true;
            break;
            default:
            info = 'Your browser could not support media casting feature';
            break;
        }
        if(!rc)alert(info);
        return rc;
    }

    function TeleCom(opts){
        var self, config, item, cn;
        self = this;
        config = {};
        for(item in opts){
            config[item] = opts[item];
        }
        this.config = config;
        cn = this.connt = new sockConnection(config);
        this.online = false;
        // media cast and scn cast 
        this.medias = [];
        config.mid = 0;
        this.avt = this.medias[0] = new medCast(config);
        config.mid = 1;
        config.scnCast = true;
        this.scn = this.medias[1] = new medCast(config);

        this.exChan = new extrChan(config);
        // user list keep the socket id list of all peers
        this.usrList = [];

        function regSigCallback(){
            cn.on('connected', function (data){
                _infLog('userid is ', data.id);
                self.medias.forEach(function(m){
                    m.myId(data.id);
                });
                self.online = true;
            });
            cn.on('joined', function (data){
                var c, id;
                c = self.config;
                id = data.id;
                _infLog('Another peer # '+id+ ' made a request to join room ' + c.room);
                if(rtc.support && data.rtc){
                    //create peerconnection
                    self.medias.forEach(function(m){
                        m.addPartener(id);
                    });
                }else{
                    self.exChan.addPartener(id);
                }
            });
            cn.on('msg', function (data){
                var id, usr;
                id = data.from;
                usr = data.usr;
                if(id>=0 && usr){
                    self.usrList[id] = usr;
                    self.onUsrList(self.usrList);
                }
                if(!rtc.support || data.sdp.type == 'exlnk'){
                    // other side could not support webrtc, send exlnk 
                    self.exChan.addPartener(id);
                    return;
                }
                self.medias[data.mid].parseSigMsg(data);
            });
            cn.on('bye',function(data){
                _infLog('Another peer # '+data.id+ ' leave room ' + self.config.room);
                var id = data.id;
                delete self.usrList[id];
                self.onUsrList(self.usrList);
                self.medias.forEach(function(m){
                    m.rmPartener(id);
                });
                self.exChan.rmPartener(id);
            });
            cn.on('dat',function(data){
                self.exChan.hdlRecv(data);
            });
            /////////////// log from server
            cn.on('log', function (array){
              console.log.apply(console, array);
            });

        }
        function regMedCallback(){
            var hdl;
            self.medias.forEach(function(m){
                m.onCmdSend = function () {
                    self.connt.emit.apply(self.connt,arguments);
                };
                m.onCastList = function(list){
                    var spkrs = [];
                    hdl = (m.config.scnCast)? self.onScnList.bind(self) 
                        : self.onSpkrList.bind(self);
                    list.forEach(function(p){
                        if(p == self.avt.myId()){
                            spkrs.push(self.config.user);
                        }else{
                            spkrs.push(self.usrList[p]);
                        }
                    });
                    hdl(spkrs);
                };
                m.onLMedAdd = function(s){
                    hdl = (m.config.scnCast)? self.onMyScnAdd.bind(self)
                        : self.onMyAvAdd.bind(self);
                    hdl(s);
                };
                m.onRMedAdd = function(s){
                    hdl = (m.config.scnCast)? self.onFrScnAdd.bind(self)
                        : self.onFrAvAdd.bind(self);
                    hdl(s);
                };
                m.onRMedDel = function(s){
                    hdl = (m.config.scnCast)? self.onFrScnRm.bind(self)
                        : self.onFrAvRm.bind(self);
                    hdl(s);
                };
                m.onMediaAct = function(s){
                    hdl = (m.config.scnCast)? self.onScnState.bind(self)
                        : self.onAvState.bind(self);
                    hdl(s);
                };
            });
            self.avt.onTextRecv = function(f,d){
                // _infLog('onTextRecv '+f,d);
                var usr = self.usrList[f];
                self.onTextRecv(usr,d);
            };
            self.avt.onCrpErro = function(c){
                self.exChan.addPartener(c.id);
            };
        }

        function regExChCallback(){
            self.exChan.onTextRecv = function(f,d){
                var usr = self.usrList[f];
                self.onTextRecv(usr,d);
            };
            self.exChan.onSend = function(){
                self.connt.emit.apply(self.connt,arguments);
            };

        }

        regSigCallback();
        regMedCallback();
        regExChCallback();

    }
    _proto = TeleCom.prototype ;
    teleCom = TeleCom;

    _proto.login = function(){
        var c = this.config;
        if(!this.online){
            this.connt.emit('join', {room:c.room,user:c.user,rtc:rtc.support});
        }
        if(!rtc.support){
            this.onWarnMsg('Your browser could not support webrtc, you could not use media casting!');
        }
    };
    _proto.logout = function(){
        if(this.online){
            this.connt.emit('bye',{room:this.config.room});
        }
    };
    
    _proto.onUsrList = function(){};
    _proto.onTextRecv = function(){};
    _proto.onSpkrList = function(){};
    _proto.onMyAvAdd = function(){};
    _proto.onFrAvAdd = function(){};
    _proto.onFrAvRm = function(){};
    _proto.onAvState = function(){};
    _proto.onScnList = function(){};
    _proto.onMyScnAdd = function(){};
    _proto.onFrScnAdd = function(){};
    _proto.onFrScnRm = function(){};
    _proto.onScnState = function(){};
    _proto.onWarnMsg = function(){};

    _proto.sendTxt2All = function(d){
        this.avt.sendTxt2All(d);
        this.exChan.sendTxt2All(d);
    };
    _proto.getSpkrStatus = function(){
        return this.avt.getMedStatus();
    };
    _proto.startSpeaking = function(c){
        if(!checkCastSupport())return;
        this.avt.useVideo(c);
        return this.avt.start();
    };
    _proto.stopSpeaking = function(){
        return this.avt.stop();
    };
    _proto.getScnStatus = function(){
        return this.scn.getMedStatus();
    };
    _proto.startscnCast = function(){
        if(!checkCastSupport())return;
        return this.scn.start();
    };
    _proto.stopscnCast = function(){
        return this.scn.stop();
    };
})();

module.exports = teleCom;
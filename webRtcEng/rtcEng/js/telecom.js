/* 
* @Author: Phenix
* @Date:   2015-11-27 09:26:39
* @Last Modified time: 2015-11-30 18:05:01
*/

'use strict';
var medCast = require('./mediacast');
var sockConnection = require('./sockconn');
var rtc = require('webrtcsupport');

var teleCom;
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


    function TeleCom(opts){
        var self, config, item, room, cn;
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
                var config =self.config;
                _infLog('Another peer # '+data.id+ ' made a request to join room ' + config.room);
                if(rtc.support && data.rtc){
                    //create peerconnection
                    self.medias.forEach(function(m){
                        m.addAttendee(data.id);
                    });
                }else{

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
                if(!rtc.support)return;
                self.medias[data.mid].parseSigMsg(data);
            });
            cn.on('bye',function(data){
                _infLog('Another peer # '+data.id+ ' leave room ' + self.config.room);
                var id = data.id;
                delete self.usrList[id];
                self.onUsrList(self.usrList);
                self.medias.forEach(function(m){
                    m.rmAttendee(id);
                });

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

        };

        regSigCallback();
        regMedCallback();

    }
    _proto = TeleCom.prototype ;
    teleCom = TeleCom;

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

    _proto.sendTxt2All = function(d){
        this.avt.sendTxt2All(d);
    };
    _proto.getSpkrStatus = function(){
        return this.avt.getMedStatus();
    };
    _proto.startSpeaking = function(c){
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
        return this.scn.start();
    };
    _proto.stopscnCast = function(){
        return this.scn.stop();
    };
})();

module.exports = teleCom;
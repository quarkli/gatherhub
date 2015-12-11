/* 
* @Author: Phenix
* @Date:   2015-12-10 14:29:47
* @Last Modified time: 2015-12-11 16:19:37
*/

'use strict';
var medCast = require('./mediacast');
var rtc = require('webrtcsupport');
var adapter = require('webrtc-adapter-test');

var rtcCom;
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


    function RtcCom(){
        var self,config;
        self = this;
        config = {};
        this.support = rtc.support;
        this.users = [];

        this.medias = [];
        config.mid = 0;
        this.avt = this.medias[0] = new medCast(config);
        config.mid = 1;
        config.scnCast = true;
        this.scn = this.medias[1] = new medCast(config);

        function regMedCallback(){
            var hdl;
            self.medias.forEach(function(m){
                m.onCmdSend = function (h,d) {
                    var data, type, dst;
                    type = 'rtc';
                    dst = getPeer.call(self,d.to);
                    if(!dst){
                        _errLog('erro id ',d.to);
                        return;
                    }
                    data = {media:d.mid,sdp:d.sdp};
                    // _infLog('send msg to '+dst, data);
                    self.dispatch(data,type,dst);
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
                // self.exChan.addPartener(c.id);
            };
        }
        regMedCallback();


    }
    function getPeerId(peer){
        var id;
        // _infLog('this.users ',this.users);
        this.users.forEach(function(p){
            if(p.peer == peer) id = p.id;
        });
        if(id == undefined){
            id = this.users.length;
            this.users.push({peer:peer,id:id});
        } 
        // _infLog('getId ',id);
        return id;
    }
    function getPeer(id){
        var peer;
        this.users.forEach(function(p){
            if(p.id == id) peer = p.peer;
        });
        return peer;
    }
    _proto = RtcCom.prototype;
    rtcCom = RtcCom;

    _proto.addPeer = function(peer){
        var id;
        if(!rtc.support) return id;
        id = getPeerId.call(this,peer);
        _infLog('Another peer '+ peer + ' # '+id+ ' made a request to join hub');
        this.medias.forEach(function(m){
            m.addPartener(id);
        });
        return id;
    };

    _proto.hdlMsg = function(peer,data){
        var id,msg,mid;
        if(!rtc.support) return id;
        // _infLog(peer+' recv msg ',data);
        id = getPeerId.call(this,peer);
        mid = data.media;
        msg = {from:id,mid:mid,sdp:data.sdp};
        if(mid!=undefined)this.medias[mid].parseSigMsg(msg);
        return id;
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


})();

module.exports = rtcCom;

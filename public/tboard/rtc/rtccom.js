/* 
* @Author: Phenix
* @Date:   2015-12-10 14:29:47
* @Last Modified time: 2015-12-17 23:16:51
*/

'use strict';
var medCast = require('./mediacast');
var rtc = require('webrtcsupport');
var adapter = require('webrtc-adapter-test');

var rtcCom;
(function(){
    var _proto, _dbgFlag, _browser;
    _dbgFlag = true;
    _browser = adapter.webrtcDetectedBrowser;

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
        this.avt.list = [];
        config.mid = 1;
        config.scnCast = true;
        this.scn = this.medias[1] = new medCast(config);
        this.scn.list = [];

        function updateCastList(){
            var list = [];
            var iflag = true;
            var video;

            self.avt.list.forEach(function(p){
                list.push({id:p.id,av:p.type,scn:false});
            });

            self.scn.list.forEach(function(p){
                for(var i=0;i<list.length;i++){
                    if(list[i].id == p.id){
                        list[i].scn = true;
                        return;
                    }
                }
                list.push({id:p.id,av:'none',scn:true});
            });
            _infLog('update list ',list);
            self.onCastList(list);
        }

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
                    m.list = list;
                    updateCastList();
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
            self.avt.onReady = function(){
                self.onReady();
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
    _proto.setMyPeer = function(peer){
        this.medias.forEach(function(m){
            m.myPeer(peer);
        });
    };

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

    _proto.removePeer = function(peer){
        var id = getPeerId.call(this,peer);
        if(id!=undefined){
            this.medias.forEach(function(m){
                m.rmPartener(id);
            });
            delete this.users[id];
        }
    }

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

    _proto.startSpeaking = function(video,errCb){
        if(!this.getRtcCap())return false;
        if(this.avt.getMedStatus()!='idle') return false;
        this.avt.start({video:video},errCb);
        return true;
    };
    _proto.stopSpeaking = function(){
        if(this.avt.getMedStatus()=='idle') return;
        this.avt.stop();
    };

    _proto.startscnCast = function(errCb){
        if(!this.getRtcCap())return false;
        if(this.scn.getMedStatus()!='idle') return false;
        this.scn.start({},errCb);
        return true;
    };
    _proto.stopscnCast = function(){
        if(this.scn.getMedStatus()=='idle') return;
        this.scn.stop();
    };

    _proto.getRtcCap = function(infCb){
        var rc = false;
        var info;
        if(!this.support){
            info = 'Your browser could not support audio/video chatting. It could not support Screen Sharing or Casting either. Please use <a href="https://www.google.com/chrome/browser/desktop/index.html"> Chrome </a> instead.';
            infCb(info);
            return rc;
        }
        switch(_browser){
            case 'firefox':
                info = 'Your browser could not support to launch a audio/video chatting.It could not launch a screen sharing either. But it could receive them. Please use <a href="https://www.google.com/chrome/browser/desktop/index.html"> Chrome </a> instead.';
                if(infCb)infCb(info);
                return rc;
            break;
            default:
                info='';
                rc = true;
                break;
        }
        return rc;
    }

    _proto.checkExtension = function(infCb){
        if(!sessionStorage.getScreenMediaJSExtensionId){
            var info = 'If you want to share your screen with others, you would better to install <a href="https://chrome.google.com/webstore/detail/gatherhub-screen-capture/bdnieppldnkoaajefibbnpmemgfdkben"> Gatherhub Screen Capture </a>. After installation, the browser needs to be restarted.';
            if(infCb){infCb(info)};
            return false;
        }
        return true;
    };


    _proto.onReady = function(){};
    _proto.onCastList = function(){};
    _proto.onTextRecv = function(){};
    _proto.onMyAvAdd = function(){};
    _proto.onFrAvAdd = function(){};
    _proto.onFrAvRm = function(){};
    _proto.onAvState = function(){};
    _proto.onMyScnAdd = function(){};
    _proto.onFrScnAdd = function(){};
    _proto.onFrScnRm = function(){};
    _proto.onScnState = function(){};
    _proto.onWarnMsg = function(){};


})();

module.exports = rtcCom;

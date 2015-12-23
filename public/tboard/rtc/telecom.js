/* 
* @Author: Phenix
* @Date:   2015-12-21 10:01:29
* @Last Modified time: 2015-12-23 19:31:17
*/

'use strict';

var localMedia =  require('./localmedia');
var WebRtc = require('./webrtc');
var CastCtrl = require('./castctrl');
var rtc = require('webrtcsupport');
var adapter = require('webrtc-adapter-test');

var teleCom;
(function(){
    var _proto, _debug, _browser;
    _debug = true;
    function TeleCom(){
        var self,config,w;
        self = this;
        config = {mid:'default',recvMedia:{}};
        this.support = rtc.support;
        w = this.webRtc = new WebRtc(config);
        this.myPid = 'default';
        this.streams = {default: w};
        this.ctrls = []; //media controllers
        this.users = []; // array to store current peerids
        this.ready =  false;
        this.actMedia = {status:'idle',idx:0};
        this.actScn = {status:'idle',idx:0};
        this.midx = 0;
        this.media =  new localMedia(); 

        function updateCastList(){
            var list = [];
            var iflag = true;
            var video;

            self.ctrls[0].castList.forEach(function(p){
                list.push({id:p.id,av:p.type,scn:false});
            });

            self.ctrls[1].castList.forEach(function(p){
                for(var i=0;i<list.length;i++){
                    if(list[i].id == p.id){
                        list[i].scn = true;
                        return;
                    }
                }
                list.push({id:p.id,av:'none',scn:true});
            });
            if(_debug)console.log('update list ',list);
            self.onCastList(list);
        }

        w.setDCRcvCb('default',function(from,data){
            var cmd =JSON.parse(data);
            self.hdlMsg(from, cmd);
        });
        w.onCmdSend =  function(h,d){
            var data, type, dst;
            type = 'rtc';
            dst = d.to;
            if(!dst){
                console.log('erro id ',d.to);
                return;
            }
            data = {media:d.mid,sdp:d.sdp};
            if(_debug)console.log('send msg to '+dst, data);
            self.dispatch(data,type,dst);
        };
        w.onReady = function(){
            if(self.ready == false){
                if(_debug)console.log('default rtc chan ready, now init cast controllers');
                for(var i = 0;i < 2; i++){
                    var m = self.ctrls[i] = new CastCtrl(i,self.myPeer());
                    m.onSend = function(cmd){
                        var data = JSON.stringify(cmd);
                        w.sendData('castCtrl',data);
                    };
                    m.onCastList = function(list){
                        //TODO: 
                        updateCastList.call(self);
                    };
                    w.setDCRcvCb('castCtrl',function(from,data){
                        var cmd = JSON.parse(data);
                        var ctrl = self.ctrls[cmd.label];
                        if(ctrl)ctrl.hdlMsg(cmd);
                    });
                }
                self.onReady();
            }
            self.ready = true;
            w.createDataChan('castCtrl');
        }

    }

    teleCom = TeleCom;
    _proto = TeleCom.prototype;

    _proto.addPeer = function(peer){
        self = this;
        if(!rtc.support || !peer) return;
        if(_debug)console.log('Another peer '+ peer + ' made a request to join hub');
        if(this.users.indexOf(peer)<0)this.users.push(peer);
        var w = this.streams['default'];
        w.addPeer(peer,'calling');
        w.createDataChan('default');
        w.startCall(peer);
        //TODO: ... when there is a casting stream, add particular partenner
        var am = this.actMedia;
        if(am.status == 'active'){
            var as = this.streams[am.mid];
            if(as){
                as.addPeer(peer,'calling');
                as.startCall(peer);
            }
        }
    };

    _proto.removePeer = function(peer){
        if(peer!=undefined){
            var m = this.streams;
            for(var i in m){
                m[i].rmPeer(peer);
            }
            var idx = this.users.indexOf(peer);
            if(idx>=0)this.users.splice(idx,1);
            if(this.users.length == 0){
                if(_debug)console.log('no one in the hub');
                //TODO: 
                self.ready = false;
            }

        }
    };

    function dcSendMsg(h,d){
        if(d.to == undefined) return;
        var data = JSON.stringify({media:d.mid,sdp:d.sdp});
        var w = this.streams.default;
        w.sendData('default',data,d.to);    
        // if(_debug)console.log('dc send msg ',data,d.to);  
    }

    _proto.hdlMsg = function(peer,data){
        var msg,mid,self;
        if(!rtc.support) return;
        self = this;
        // if(_debug)console.log(peer,' recv msg ',data);
        if(this.users.indexOf(peer)<0)this.users.push(peer);
        mid = data.media;
        msg = {from:peer,mid:mid,sdp:data.sdp};
        if(mid!=undefined){
            if(this.streams[mid]==undefined){
                var config = {mid:mid};
                var w = this.streams[mid] = new WebRtc(config);
                w.onCmdSend = dcSendMsg.bind(this);
                w.onRMedAdd = this.onFrAvAdd;
                w.onRMedDel = this.onFrAvRm;
            }
            this.streams[mid].parseSigMsg(msg);
            var am = this.actMedia;
            if(mid ==  am.mid && am.status == 'close'&& msg.sdp.type == 'answer'){
                if(self.streams[am.mid].remove(peer)==0){
                    delete self.streams[am.mid];
                    am.status = 'idle';
                }
            }
        };
    };

    _proto.myPeer = function(v){
        return (v==undefined)? this.myPid : this.myPid = v;
    };

    function startStream(oneway,strm){
        var mid = this.myPeer()+(this.midx++);
        this.actMedia.mid = mid;
        var config = {mid:mid,oneway:oneway};
        var w = this.streams[mid] = new WebRtc(config);
        w.onCmdSend = dcSendMsg.bind(this);
        w.onRMedAdd = this.onFrAvAdd;
        w.onRMedDel = this.onFrAvRm;
        console.log('user list is ',this.users)
        this.users.forEach(function(p){
            w.addPeer(p,'calling');
            w.startCall(p,strm);
        });
    }

    _proto.startSpeaking = function(cfg,errCb){
        var self,cs,type;
        self = this;
        if(cfg.video) cs = { video: true, audio: true};
        type = (cfg.video)? 'video' : 'audio';
        var am = this.actMedia;
        if(am.status != 'idle')return;
        this.media.start(cs,function(err,s){
            if(!err){
                am.status = 'active';
                if(cfg.oneway){
                    am.strm = s;
                    self.ctrls[0].start(function(){
                        var strm = am.strm;
                        if(strm){
                            self.onMyAvAdd(strm);
                            startStream.call(self,true,strm);
                        }
                    },type);
                }else{
                    startStream.call(self,false,s);
                }
            }else{
                if(errCb)errCb(err);
            }
        });
        return true;
    };

    _proto.stopSpeaking = function(){
        var self = this;
        var c = this.ctrls[0];
        var am = this.actMedia;
        var w = this.streams[am.mid];
        if(am.status == 'idle')return;
        this.media.stop(function(s){
            c.stop(function(){
                if(s)w.stopCall(s);
                am.status = 'close';
                delete am.strm;
            });
        });

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

    _proto.dispatch = function(){};
    _proto.onReady = function(){};
    _proto.onCastList = function(){};
    _proto.onMyAvAdd = function(){};
    _proto.onFrAvAdd = function(){};
    _proto.onFrAvRm = function(){};
    _proto.onMyScnAdd = function(){};
    _proto.onFrScnAdd = function(){};
    _proto.onFrScnRm = function(){};

})();

module.exports = teleCom;


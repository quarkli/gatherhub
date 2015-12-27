/* 
* @Author: Phenix
* @Date:   2015-12-21 10:01:29
* @Last Modified time: 2015-12-27 09:50:15
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

        function addPeer2Talk(peer,type){
            var am = (type=='scn')? self.actScn: self.actMedia;
            if(am.status == 'active'){
                var w = self.streams[am.mid];
                var s = am.strm;
                if(w&&s){
                    console.log('create peer');
                    w.addPeer(peer,'calling');
                    w.startCall(peer,s);
                }
            }
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
                        updateCastList();
                    };
                    m.onAddPr2Talk = addPeer2Talk;
                    w.setDCRcvCb('castCtrl',function(from,data){
                        var cmd = JSON.parse(data);
                        var ctrl = self.ctrls[cmd.label];
                        if(ctrl)ctrl.hdlMsg(cmd);
                    });
                }
                self.onReady();
                setTimeout(function(){
                    for(var i=0;i<2;i++){self.ctrls[i].login();}
                }, 400);
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
    };

    function rlsMedia(type){
        var am = (type=='scn')? this.actScn: this.actMedia;
        if(am.status != 'close') return;
        if(am.strm){
            if(type == 'scn'){
                this.media.rlsScn();
            }else{
                this.media.stop();
            }
            delete(am.strm);
        }
        am.status = 'idle';
    }

    _proto.removePeer = function(peer){
        if(peer!=undefined){
            var m = this.streams;
            for(var i in m){
                m[i].rmPeer(peer);
                if(i.indexOf(peer)==0){
                    if(_debug)console.log('need remove stream ',i);
                    m[i].onRMedDel();
                    delete m[i];
                }
            }
            this.ctrls.forEach(function(p){
                p.rmPeer(peer);
            });
            var idx = this.users.indexOf(peer);
            if(idx>=0)this.users.splice(idx,1);
            if(this.users.length == 0){
                if(_debug)console.log('no one in the hub');
                //TODO: 
                this.ready = false;
                this.onDisconnect();
                if(this.actMedia.status!='idle'){
                    this.actMedia.status = 'close';
                    rlsMedia.call(this,'audio');
                }
                if(this.actScn.status!='idle'){
                    this.actScn.status = 'close';
                    rlsMedia.call(this,'scn');
                }
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
        var msg,mid,self,scn;
        if(!rtc.support) return;
        self = this;
        // if(_debug)console.log(peer,' recv msg ',data);
        if(this.users.indexOf(peer)<0)this.users.push(peer);
        mid = data.media;
        scn = mid.indexOf(peer+'-scn-');
        // console.log('mid is ',mid,' scn is ',scn);
        msg = {from:peer,mid:mid,sdp:data.sdp};
        if(mid!=undefined){
            if(this.streams[mid]==undefined){
                var config = {mid:mid};
                if(msg.sdp.type != 'offer'){
                    console.log('could not init webrtc from msg ',msg);
                    return;
                }
                var w = this.streams[mid] = new WebRtc(config);
                w.onCmdSend = dcSendMsg.bind(this);
                if(scn==0){
                    w.onRMedAdd = this.onFrScnAdd;
                    w.onRMedDel = this.onFrScnRm;
                }else{
                    w.onRMedAdd = this.onFrAvAdd;
                    w.onRMedDel = this.onFrAvRm;
                }
            }else{
                if(mid.indexOf(peer)==0 && msg.sdp.type == 'offer'){
                    //second offer, should be bye, destroy the streams[mid] after 3 seconds
                    if(_debug)console.log('recv msg with offer is ', msg);

                    setTimeout(function(){
                        if(_debug)console.log('destroy stream ',mid, ' after 3 seconds ');
                        delete self.streams[mid];
                    },3000);
                }
            }
            this.streams[mid].parseSigMsg(msg);
            var am = this.actMedia;
            if(mid ==  am.mid && am.status == 'close'&& msg.sdp.type == 'answer'){
                if(self.streams[am.mid].remove(peer)==0){
                    delete self.streams[am.mid];
                    am.status = 'idle';
                }
            }
            var as = this.actScn;
            if(mid == as.mid && as.status == 'close' && msg.sdp.type == 'answer'){
                if(self.streams[as.mid].remove(peer)==0){
                    delete self.streams[as.mid];
                    as.status = 'idle';
                }
            }
        };
    };

    _proto.myPeer = function(v){
        return (v==undefined)? this.myPid : this.myPid = v;
    };

    function startStream(type,oneway,strm){
        var mid = this.myPeer()+'-'+type+'-'+(this.midx++);
        var config = {mid:mid,oneway:oneway};
        var w = this.streams[mid] = new WebRtc(config);
        w.onCmdSend = dcSendMsg.bind(this);
        if(type == 'scn'){
            w.onRMedAdd = this.onFrScnAdd;
            w.onRMedDel = this.onFrScnRm;
            this.actScn.mid = mid;
        }else{
            w.onRMedAdd = this.onFrAvAdd;
            w.onRMedDel = this.onFrAvRm;
            this.actMedia.mid = mid;
        }
        this.users.forEach(function(p){
            w.addPeer(p,'calling');
            w.startCall(p,strm);
        });
    }

    _proto.startAVCast = function(cfg,errCb){
        var self,cs,type;
        self = this;
        if(cfg.video) cs = { video: true, audio: true};
        type = (cfg.video)? 'video' : 'audio';
        var am = this.actMedia;
        if(am.status != 'idle')return;
        this.ctrls[0].start(function(){
            am.status = 'trying';
            self.media.start(cs,function(err,s){
                if(!err){
                    am.strm = s;
                    self.onMyAvAdd(s);
                    startStream.call(self,type,true,s);
                    am.status = 'active';
                }else{
                    am.status = 'idle';
                    if(errCb)errCb(err);
                }
            });
        }, type);
        return true;
    };

    _proto.stopAVCast = function(){
        var self = this;
        var c = this.ctrls[0];
        var am = this.actMedia;
        var w = this.streams[am.mid];
        if(am.status == 'idle')return;
        c.stop(function(){
            self.media.stop(function(s){
                if(s)w.stopCall(s);
                am.status = 'close';
                delete am.strm;
                setTimeout(function(){
                    rlsMedia.call(self,'audio');
                }, 2000);
            });
        });
    };

    _proto.startscnCast = function(errCb){
        var self = this;
        var as = this.actScn;
        var type = 'scn';
        if(as.status != 'idle')return;
        this.ctrls[1].start(function(){
            as.status = 'trying';
            self.media.getScn(function(err,s){
                if(!err){
                    as.strm = s;
                    self.onMyScnAdd(s);
                    startStream.call(self,type,true,s);
                    as.status = 'active';
                }else{
                    as.status = 'idle';
                    if(errCb)errCb(err);
                }
            });
        },type);
        return true;
    };

    _proto.stopscnCast = function(){
        var self = this;
        var as = this.actScn;
        var c = this.ctrls[1];
        var w = this.streams[as.mid];
        // console.log('w is ',w, ' as.mid ',as.mid);
        if(as.status == 'idle')return;
        c.stop(function(){
            self.media.rlsScn(function(s){
                if(s)w.stopCall(s);
                as.status = 'close';
                delete as.strm;
                setTimeout(function(){
                    rlsMedia.call(self,'scn');
                }, 2000);

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
    _proto.onDisconnect = function(){};

})();

module.exports = teleCom;


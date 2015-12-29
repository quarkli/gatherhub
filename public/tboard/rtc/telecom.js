/* 
* @Author: Phenix
* @Date:   2015-12-21 10:01:29
* @Last Modified time: 2015-12-28 17:09:35
*/

'use strict';

var localMedia =  require('./localmedia');
var WebRtc = require('./webrtc');
var CastCtrl = require('./castctrl');
var rtc = require('webrtcsupport');
var adapter = require('webrtc-adapter-test');
var CallCtrl = require('./callctrl');

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
        this.castCtrls = []; //media controllers
        this.users = []; // array to store current peerids
        this.ready =  false;
        this.actMedia = {status:'idle'};
        this.actScn = {status:'idle'};
        this.midx = 0;
        this.media =  new localMedia(); 


        function updateCastList(){
            var list = [];
            var iflag = true;
            var video;

            self.castCtrls[0].castList.forEach(function(p){
                list.push({id:p.id,av:p.type,scn:false});
            });

            self.castCtrls[1].castList.forEach(function(p){
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
                    var m = self.castCtrls[i] = new CastCtrl(i,self.myPeer());
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
                        var ctrl = self.castCtrls[cmd.label];
                        if(ctrl)ctrl.hdlMsg(cmd);
                    });
                }
                //init call controllers
                var cc = self.callCtrl = new CallCtrl();
                cc.onCallIn = function(peer,type){
                    if(self.actMedia.status != 'idle')return;
                    self.onCallRing(peer,type);
                    return true;
                };
                cc.onCallInEnd = function(){
                    self.onCallInEnd();
                };
                cc.onCmdSend = function(cmd){
                    var data = JSON.stringify(cmd);
                    w.sendData('default',data,cmd.to);
                };

                cc.onTalkEnd = function(){
                    self.media.stop(function(s){
                        if(s){
                            var wr = self.streams[cc.mid];
                            var p = cc.dst;
                            if(wr){
                                if(wr.type =='calling'){
                                    wr.stopCall(p,s);
                                    setTimeout(function(){
                                        wr.remove(p);
                                        delete self.streams[cc.mid];
                                        cc.reset();
                                    }, 3000);
                                }else{
                                    wr.setAnsStrm(s,'del');
                                }
                            }
                            // hide div ....
                        }
                    });
                };

                self.onReady();
                self.callCtrl.setId(self.myPeer());
                setTimeout(function(){
                    for(var i=0;i<2;i++){self.castCtrls[i].login();}
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
            this.castCtrls.forEach(function(p){
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
        var msg,mid,self,scn,oneway;
        if(!rtc.support) return;
        self = this;
        var cc = this.callCtrl;
       // if(_debug)console.log(peer,' recv msg ',data);
        if(this.users.indexOf(peer)<0)this.users.push(peer);
        mid = data.media;
        if(mid==undefined){
            // call ctrler msg;
            if(cc)cc.hdlMsg(data);
            return;
        }
        scn = mid.indexOf(peer+'-scn-');
        oneway = (data.oneway == false)? false: true;
        // console.log('mid is ',mid,' scn is ',scn);
        msg = {from:peer,mid:mid,sdp:data.sdp};
        if(mid!=undefined){
            if(this.streams[mid]==undefined){
                var config = {mid:mid,oneway:oneway};
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
                if(oneway == false && cc && cc.status == 'active' && cc.strm){
                    cc.mid = mid;
                    w.setAnsStrm(cc.strm,'add');
                }
            }else{
                if(mid.indexOf(peer)==0 && msg.sdp.type == 'offer'){
                    //second offer, should be bye, destroy the streams[mid] after 3 seconds
                    if(_debug)console.log('recv msg with offer is ', msg);

                    setTimeout(function(){
                        if(_debug)console.log('destroy stream ',mid, ' after 3 seconds ');
                        if(cc.mid == mid)cc.reset();
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

    function startStream(type,oneway,strm,id){
        var mid = this.myPeer()+'-'+type+'-'+(this.midx++);
        var config = {mid:mid,oneway:oneway};
        var w = this.streams[mid] = new WebRtc(config);
        w.onCmdSend = dcSendMsg.bind(this);
        if(type == 'scn'){
            w.onRMedAdd = this.onFrScnAdd;
            w.onRMedDel = this.onFrScnRm;
        }else{
            w.onRMedAdd = this.onFrAvAdd;
            w.onRMedDel = this.onFrAvRm;
        }
        if(id){
            var pc = this.users[id];
            if(pc){
                w.addPeer(pc,'calling');
                w.startCall(pc,strm);
            }
        }else{
            this.users.forEach(function(p){
                w.addPeer(p,'calling');
                w.startCall(p,strm);
            });
        }
        return mid;
    }

    _proto.startAVCast = function(cfg,errCb){
        var self,cs,type;
        self = this;
        if(cfg.video) cs = { video: true, audio: true};
        type = (cfg.video)? 'video' : 'audio';
        var am = this.actMedia;
        var cc = this.callCtrl;
        if(am.status != 'idle'|| cc.status != 'idle')return;
        this.castCtrls[0].start(function(){
            am.status = 'trying';
            self.media.start(cs,function(err,s){
                if(!err){
                    am.strm = s;
                    self.onMyAvAdd(s);
                    am.mid = startStream.call(self,type,true,s);
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
        var c = this.castCtrls[0];
        var am = this.actMedia;
        var w = this.streams[am.mid];
        if(am.status == 'idle')return;
        c.stop(function(){
            self.media.stop(function(s){
                if(s){
                    self.users.forEach(function(p){
                        w.stopCall(p,s);
                    });
                }
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
        this.castCtrls[1].start(function(){
            as.status = 'trying';
            self.media.getScn(function(err,s){
                if(!err){
                    as.strm = s;
                    self.onMyScnAdd(s);
                    as.mid = startStream.call(self,type,true,s);
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
        var c = this.castCtrls[1];
        var w = this.streams[as.mid];
        // console.log('w is ',w, ' as.mid ',as.mid);
        if(as.status == 'idle')return;
        c.stop(function(){
            self.media.rlsScn(function(s){
                if(s){
                    self.users.forEach(function(p){
                        w.stopCall(p,s);
                    });
                }
                as.status = 'close';
                delete as.strm;
                setTimeout(function(){
                    rlsMedia.call(self,'scn');
                }, 2000);

            });
        });
    };

    _proto.startPrTalk = function(peer,type,errCb){
        var self,cs;
        self = this;
        var cc = this.callCtrl;
        var am = this.actMedia;
        if(cc.status != 'idle' || am.status != 'idle')return;
        cc.start(peer,type,function(err,type){
            if(err){
                if(_debug)console.log('call start failed : ',err.name);
                if(errCb)errCb(err);
            }else{
                if(type=='video') cs = { video: true, audio: true};
                self.media.start(cs,function(err,s){
                    if(err){
                        if(errCb)errCb(err);
                        cc.reset();
                    }else{
                        self.onMyAvAdd(s);
                        cc.mid = startStream.call(self,type,false,s,peer);
                    }
                });
            }
        });
    };

    _proto.stopPrTalk = function(){
        var cc = this.callCtrl;
        var w = this.streams[cc.mid];
        var p = cc.dst;
        if(cc.status == 'idle')return;
        cc.stop(function(){
            self.media.stop(function(s){
                if(w.type == 'calling'){
                    w.stopCall(p,s);
                    setTimeout(function(){
                        w.remove(p);
                        delete self.streams[cc.mid];
                        cc.reset();
                    }, 3000);
                }else{
                    w.setAnsStrm(s,'del');
                }
            });
        });
    }

    _proto.answerPrTalk = function(type){
        var cc = this.callCtrl;
        if(type=='deny'){
            cc.answer(type);
        }else{
            if(type=='video')cs = { video: true, audio: true};
            this.media.start(cs,function(err,s){
                if(err){
                    cc.answer('deny');
                }else{
                    self.onMyAvAdd(s);
                    cc.answer(type);
                    cc.strm = s;
                }
            });
        }

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
    _proto.onCallIn = function(){};
    _proto.onCallInEnd = function(){};

})();

module.exports = teleCom;


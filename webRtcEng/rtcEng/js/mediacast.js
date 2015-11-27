/* 
* @Author: phenix cai
* @Date:   2015-11-19 10:08:39
* @Last Modified time: 2015-11-26 22:10:02
*/
var webRtc = require('./webrtc');
var castCtrl = require('./castctrl');
var medCast;
(function(){
    var _proto;
    function extend(func){
            var base = function(){};
            base.prototype = func.prototype;
            return new base();
    }

    function MedCast(opts){
        var self, cn;      
        self = this;
        webRtc.call(this,opts);
        //media casting list
        this.castList = [];
        this.initFlag = false;
        this.mediaActive = 'idle';
    }
    _proto = MedCast.prototype = extend(webRtc);
    medCast = MedCast;

    _proto.startSpeaking = function(){
        var self = this;
        if(this.ctrl)this.ctrl.start(function(){
            self.startMedia(function(){
                self._setMedState('active');
            }, function(err){
                console.log('Error', err);
                self._setMedState('idle');
            });
        });
        this._setMedState('pending');
    };

    _proto.stopSpeaking = function(){
        var self = this;
        if(this.ctrl)this.ctrl.stop(function(){
            self.stopMedia();
        });
        this._setMedState('idle');
    };

    _proto.onCastList = function(){};
    _proto.onMediaAct = function(){};

    //internal APIs
    _proto._initCmdChan = function(){
        var self;
        self = this;
        if(this.initFlag == false){
            this.ctrl = new castCtrl(this.config.usrId);
            this.ctrl.onSend = function(cmd){
                var data = JSON.stringify(cmd);
                console.log('castcmd send ',data);
                self.sendData('castCtrl',data);
            };
            this.ctrl.onCastList = function(list){
                var spkrs = [];
                list.forEach(function(p){
                    if(p == self.config.usrId){
                        spkrs.push(self.config.user);
                    }else{
                        spkrs.push(self.usrList[p]);
                    }
                });
                self.onCastList(spkrs);
            }
            setTimeout(function(){
                self.ctrl.login();
            }, 400);
            this.initFlag = true;
        }
        this.createDataChan('castCtrl',function(from,data){
            var cmd = JSON.parse(data);
            self.ctrl.hdlMsg(cmd);
        });
    };

    _proto._onChansReady = function(){
        this._initCmdChan();
    };

    _proto._setMedState = function(state){
        this.mediaActive = state;
        this.onMediaAct(state);
    };


})();

module.exports = medCast;
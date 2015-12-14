/* 
* @Author: phenix cai
* @Date:   2015-11-19 10:08:39
* @Last Modified time: 2015-12-14 14:37:57
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
        this.mState = 'idle';
    }
    _proto = MedCast.prototype = extend(webRtc);
    medCast = MedCast;

    _proto.getMedStatus = function(){
        return this.mState;
    };

    _proto.start = function(cs){
        var self, hdl, type;
        self = this;
        hdl = (this.config.scnCast) ? this.startScreen.bind(this) 
            : this.startMedia.bind(this);
        type = (this.config.scnCast)? 'scn': ((cs.video)? 'video': 'audio');
        if(this.ctrl)this.ctrl.start(function(){
            hdl(function(){
                self._setMedState('active');
            }, function(err){
                console.log('Error', err);
                self._setMedState('idle');
            },cs);
        },type);
        this._setMedState('pending');
    };

    _proto.stop = function(){
        var self, hdl;
        self = this;
        hdl = (this.config.scnCast) ? this.stopScreen.bind(this) 
            : this.stopMedia.bind(this);
        if(this.ctrl)this.ctrl.stop(function(){
            hdl();
        });
        this._setMedState('idle');
    };

    _proto.onCastList = function(){};
    _proto.onMediaAct = function(){};
    _proto.onReady = function(){};

    //internal APIs
    _proto._initCmdChan = function(){
        var self;
        self = this;
        if(this.initFlag == false){
            this.ctrl = new castCtrl(this.myPeer());
            this.ctrl.onSend = function(cmd){
                var data = JSON.stringify(cmd);
                // console.log('castcmd send ',data);
                self.sendData('castCtrl',data);
            };
            this.ctrl.onCastList = this.onCastList.bind(this);
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

    _proto.onChansReady = function(){
        this._initCmdChan();
        this.onReady();
    };

    _proto._setMedState = function(state){
        this.mState = state;
        this.onMediaAct(state);
    };
    _proto.myPeer = function(v){
        return (v==undefined)? this._myPeer : this._myPeer = v;
    };


})();

module.exports = medCast;
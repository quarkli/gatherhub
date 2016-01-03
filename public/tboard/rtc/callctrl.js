/* 
* @Author: Phenix
* @Date:   2015-12-28 12:34:55
* @Last Modified time: 2016-01-02 21:39:40
*/

'use strict';
var callCtrl;
(function(){
    var _proto, _debug;
    _debug = true;
    function CallCtrl(){
        this.id = 0;
        this.status = 'idle';
        this.dst = 0;
    }
    
    _proto = CallCtrl.prototype;
    callCtrl = CallCtrl;

    _proto.setId = function(id){
        this.id = id;
    };
    //calling part
    function callingEnd(){
        var err = {name: this.dst+' is busy, try it later'};
        this.onStartCb(err);
        this.status = 'idle';
    }
    _proto.start = function(peer,type,cb){
        var self = this;
        this.onCmdSend({cmd:'start',from:this.id,to:peer,type:type});
        this.status = 'trying';
        this.onStartCb = cb;
        this.dst = peer;
        this.timer =setTimeout(function(){
            callingEnd.call(self);
        }, 30000);
    };

    _proto.stop = function(cb){
        this.onCmdSend({cmd:'stop',from:this.id,to:this.dst});
        if(this.status == 'active'){
            if(cb)cb();
            this.status = 'close';
        }else{
            //trying
            this.status = 'idle';
        }
    };
    // called part
    _proto.answer = function(type){
        var peer = this.dst;
        if(type == 'deny'){
            this.onCmdSend({cmd:'deny',from:this.id,to:peer});
            this.status = 'idle';
        }else{
            this.onCmdSend({cmd:'accept',from:this.id,to:peer,type:type});
            this.status = 'active';
        }

    };

    _proto.reset = function(){
        this.status = 'idle';
    };

    _proto.hdlMsg = function(msg){
        var self = this;
        var peer = msg.from;
        var cmd = msg.cmd;

        if(_debug)console.log('call ',peer,' status is ',this.status, ' cmd is ',cmd);
        switch(this.status){
            case 'idle':
                switch(cmd){
                    case 'start':
                        if(this.onCallIn(peer,msg.type)){
                            this.dst = peer,
                            this.status = 'ringing';
                        }else{
                            this.onCmdSend({cmd:'deny',from:this.id,to:peer});
                        }
                    break;
                }
            break;
            case 'trying':
                switch(cmd){
                    case 'deny':
                        clearTimeout(this.timer);
                        callingEnd.call(this);
                    break;
                    case 'accept':
                        clearTimeout(this.timer);
                        this.onStartCb(null,msg.type);
                        this.status = 'active';
                    break;
                    default:
                        this.onCmdSend({cmd:'deny',from:this.id,to:peer});
                    break;
                }
            break;
            case 'ringing':
                if(cmd=='stop'){
                    this.onCallInEnd();
                    ths.status = 'idle';
                }
            break;
            case 'active':
                if(cmd == 'stop'){
                    this.onTalkEnd();
                    this.status = 'close';
                }
            break;

        }

    };
    _proto.onCmdSend = function(){};
    _proto.onCallIn = function(){};
    _proto.onCallInEnd = function(){};
    _proto.onCallStart = function(){};
    _proto.onTalkEnd = function(){};

})();

module.exports = callCtrl;
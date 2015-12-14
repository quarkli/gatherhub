/* 
* @Author: Phenix Cai
* @Date:   2015-11-22 10:02:34
* @Last Modified time: 2015-12-14 10:01:20
*/



var castCtrl;


(function(){
    var _proto, t1, t2, t3, _dbgFlag;
    // constant
    t1 = 150;
    t2 = 250;
    t3 = (t1+t2)*2;
    _dbgFlag = true;
    function _infLog(){
        if(_dbgFlag){
            console.log.apply(console, arguments);
        }
    }

    function objSetTimeout(obj,func,time){
        var t;
        t = setTimeout(function(){
            func.call(obj);
        },time);
        return t;
    }

    function CastCtrl(id){
        this.castList  = [];
        this.pendList = []; 
        this.id = id;
        this.reqTimer;
        this.reqCnt = 0;
        this.reqWait = 0;

    }

    _proto = CastCtrl.prototype;
    castCtrl = CastCtrl;
    // callback functions
    _proto.onSend = function(){};
    _proto.onCastList = function(){};


    // api functions
    _proto.login = function(){
        this.onSend({from:this.id, to:'All',cmd:'hello'});
    };

    _proto.bye = function(id){
        this.recvMsg({from:id, to:this.id, cmd:'rls'});
    };

    _proto.start = function(cb){
        this._startCb = cb;
        this._startCastReq();
    };

    _proto.stop = function(cb){
        this._stopCb  = cb;
        this._stopCastReq();
    };

    _proto.hdlMsg =  function (msg){
        var myself, rid, delay, idx;
        myself = this.id;
        rid = msg.from;
        _infLog(this.id +' hdlMsg ',msg);
        switch(msg.cmd)
        {
            case 'req':
                if(this.castList[0] == myself){
                    this.castList.push(rid);
                    this._infCastList();
                }else{
                    this.pendList.push(rid);
                }
            break;
            case 'rls':
                if(this.castList[0] == myself){
                    idx = this.castList.indexOf(rid);
                    if(idx >= 0){
                        this.castList.splice(idx,1);
                        this._infCastList();
                    }else{
                        idx = this.pendList.indexOf(rid);
                        if(idx >=0 )this.pendList.splice(idx,1);
                    }
                }
            break;
            case 'list':
                this.pendList = [];
                this.castList = msg.list;
                this.onCastList(this.castList);
                _infLog('cmp ',this.castList[0] + ' vs '+myself);

                if(this.castList[0] == myself){
                    if(this._startCb)this._startCb();
                }else{
                    if(this.reqCnt > 0){
                        _infLog(this.id+' stop timer');
                        clearTimeout(this.reqTimer);
                        this.reqCnt = 0;
                    }
                    if(this.reqWait == 1){
                        this._startCastReq();
                        this.reqWait = 0;
                    }
                }
            break;
            case 'hello':
                _infLog('cmp ',this.castList[0] + ' vs ',+myself);
                if(this.castList[0] == myself){
                    this._infCastList();
                }
            break;
        }

    };


    //internal functions

    // _proto._startCb = function(){};
    // _proto._stopCb  = function(){};

    _proto._infCastList =  function(){
        var list, from, to;
        from = this.id;
        list = this.castList;
        to = 'All';
        this.onSend({from:from, to:to, cmd:'list',list:list});
        this.onCastList(list);
    };

    _proto._sendCastReq = function(){
        var from, to;
        from = this.id;
        to = 'All';
        this.onSend({from:from, to:to, cmd:'req'});
    };

    _proto._cancelCastReq = function(){
        var from, to;
        from = this.id;
        to = 'All';
        this.onSend({from:from, to:to, cmd:'rls'});
    };

    _proto._reqTimerHdl = function(){
        _infLog(this.id + ' _reqTimerHdl', this.reqCnt);
        this.reqCnt --;
        if(this.reqCnt > 0){
            this._sendCastReq();
            this.reqTimer = objSetTimeout(this,this._reqTimerHdl, t2);
        }else if (this.reqCnt == 0){
            if(this.pendList.length > 0){
                _infLog('collision occurs');
                delay = t1 + Math.ceil(Math.random()*t3);
                this.reqTimer = objSetTimeout(this,this._startCastReq, delay);
                this.pendList = [];
                return;
            }
            if(this.castList.length > 0)this.castList.shift();
            this.castList.push(this.id);
            this._infCastList();
            if(this.castList[0] == this.id){
                if(this._startCb)this._startCb();
            }
        }


    };


    _proto._startCastReq = function(){
        var self = this;

        if(this.pendList.length > 0){
            _infLog(this.id + ' warn: there is some un-handled reqs here. ',this.pendList);
            this.reqWait = 1; 
            return;
        }
        this.reqCnt = 2; 
        this._sendCastReq();
        this.reqTimer = objSetTimeout(this,this._reqTimerHdl, t1);
    };

    _proto._stopCastReq = function(){
        if(this.castList[0] == this.id){
            if(this._stopCb )this._stopCb();
            this.castList.shift();
            this._infCastList();
        }else{
            this._cancelCastReq();
            clearTimeout(this.reqTimer);
            this.reqCnt = 0;
        }
    };

})();

module.exports = castCtrl;
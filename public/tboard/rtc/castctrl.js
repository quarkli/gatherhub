/* 
* @Author: Phenix Cai
* @Date:   2015-11-22 10:02:34
* @Last Modified time: 2016-01-02 15:46:36
*/



var castCtrl;


(function(){
    var _proto, t1, t2, t3, _debug;
    // constant
    t1 = 150;
    t2 = 250;
    t3 = (t1+t2)*2;
    _debug = false;

    function objSetTimeout(obj,func,time){
        var t;
        t = setTimeout(function(){
            func.call(obj);
        },time);
        return t;
    }

    function CastCtrl(label,id){
        this.castList  = [];
        this.pendList = []; 
        this.label = label;
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
    _proto.onAddPr2Talk = function(){};


    // api functions
    _proto.login = function(){
        this.onSend({from:this.id, label: this.label, to:'All',cmd:'hello'});
    };

    _proto.rmPeer = function(id){
        this.hdlMsg({from:id, label:this.label, to:this.id, cmd:'rls'});
    };

    _proto.start = function(cb,type){
        this._startCb = cb;
        this.type = type;
        this._startCastReq();
    };

    _proto.stop = function(cb){
        this._stopCb  = cb;
        this._stopCastReq();
    };

    function getCastIdx(id){
        var idx = -1;
        for(var i=0;i<this.castList.length;i++){
            if(this.castList[i].id == id){
                idx = i;
                break;
            }
        }
        return idx;
    }

    _proto.hdlMsg =  function (msg){
        var myself, rid, delay, idx;
        myself = this.id;
        rid = msg.from;
        if(_debug)console.log(this.id +' hdlMsg ',msg);
        switch(msg.cmd)
        {
            case 'req':
                if(this.castList[0] && this.castList[0].id == myself){
                    this.castList.push({id:rid,type:msg.type});
                    this._infCastList();
                }else{
                    this.pendList.push(rid);
                }
            break;
            case 'rls':
                if(this.castList[0] && this.castList[0].id == rid && 
                    this.castList[1] && this.castList[1].id == myself){
                    this.castList.shift();
                    this._infCastList();
                    if(this._startCb)this._startCb();
                    return;
                }
                if(this.castList[0] && this.castList[0].id == myself){
                    idx = getCastIdx.call(this,rid); 
                    if(idx >= 0){
                        this.castList.splice(idx,1);
                        this._infCastList();
                    }
                }else{
                    idx = this.pendList.indexOf(rid);
                    if(idx >=0 )this.pendList.splice(idx,1);
                }
            break;
            case 'list':
                this.pendList = [];
                this.castList = msg.list;
                this.onCastList(this.castList);
                if(_debug)console.log('cmp '+ myself + ' vs ',this.castList[0]);

                if(this.castList[0] && this.castList[0].id == myself){
                    if(this._startCb)this._startCb();
                }else{
                    if(this.reqCnt > 0){
                        if(_debug)console.log(this.id+' stop timer');
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
                if(_debug)console.log('hello cmp '+ myself + ' vs ',this.castList[0]);
                if(this.castList[0] && this.castList[0].id == myself){
                    var type = this.castList[0].type;
                    this.onAddPr2Talk(rid,type);
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
        this.onSend({from:from, label:this.label, to:to, cmd:'list',list:list});
        this.onCastList(list);
    };

    _proto._sendCastReq = function(){
        var from, to, type;
        from = this.id;
        to = 'All';
        type = this.type;
        this.onSend({from:from, label:this.label, to:to, cmd:'req', type:type});
    };

    _proto._cancelCastReq = function(){
        var from, to;
        from = this.id;
        to = 'All';
        this.onSend({from:from, label:this.label, to:to, cmd:'rls'});
    };

    _proto._reqTimerHdl = function(){
        if(_debug)console.log(this.id + ' _reqTimerHdl', this.reqCnt);
        this.reqCnt --;
        if(this.reqCnt > 0){
            this._sendCastReq();
            this.reqTimer = objSetTimeout(this,this._reqTimerHdl, t2);
        }else if (this.reqCnt == 0){
            if(this.pendList.length > 0){
                if(_debug)console.log('collision occurs');
                delay = t1 + Math.ceil(Math.random()*t3);
                this.reqTimer = objSetTimeout(this,this._startCastReq, delay);
                this.pendList = [];
                return;
            }
            if(this.castList.length > 0)this.castList.shift();
            this.castList.push({id:this.id,type:this.type});
            this._infCastList();
            if(this.castList[0].id == this.id){
                if(this._startCb)this._startCb();
            }
        }


    };


    _proto._startCastReq = function(){
        var self = this;
        if(this.pendList.length > 0){
            if(_debug)console.log(this.id + ' warn: there is some un-handled reqs here. ',this.pendList);
            this.reqWait = 1; 
            return;
        }
        this.reqCnt = 2; 
        this._sendCastReq();
        this.reqTimer = objSetTimeout(this,this._reqTimerHdl, t1);
    };

    _proto._stopCastReq = function(){
        if(this.castList[0] && this.castList[0].id == this.id){
            if(this._stopCb)this._stopCb();
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
/* 
* @Author: phenix cai
* @Date:   2015-11-19 10:08:39
* @Last Modified time: 2015-11-19 18:11:22
*/
var webRtc = require('./webrtc');
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
        this.mediaActive = 'idle';
        //////////////command for audio casting
        function getMediaCastList(audCon){
            //reset it everytime
            self.castList = [];
            if(audCon.state==1){
                if(audCon.talk == self.config.usrId){
                    self.castList[0] = self.config.user;
                }else{
                    self.castList[0] = self.usrList[audCon.talk];
                }
                
                audCon.que.forEach(function(id){
                    if(id == self.config.usrId){
                        self.castList[self.castList.length] = self.config.user;
                    }else{
                        self.castList[self.castList.length] = self.usrList[id];
                    }
                });
            } 
        }
        cn = this.connt;
        //media casting feature
        function startMediaJob(){
            if(self.isRmtAudOn()){
                console.log('remote stream still active');
                setTimeout(startMediaJob, 100);
            }else{
                self.startMedia(function(s){
                    self.setMediaAct('active');
                },function(err){
                    console.log('Error',err);
                    self.setMediaAct('idle');
                });
            }
        }

        cn.on('media', function (message){
            var cmd = message.cmd;
            if(!self.isRtcReady()){
                console.log('warning ','could not support media casting!');
                return;
            }
            if(cmd == 'ans'){
                startMediaJob();
            }else if(cmd == 'update'){
                console.log('msg update',message.control);
                if(message.control){
                    getMediaCastList(message.control);
                    self.onCastList(self.castList);
                }
            }
        });

    }
    _proto = MedCast.prototype = extend(webRtc);
    medCast = MedCast;
    _proto.setMediaAct = function(state){
        this.mediaActive = state;
        this.onMediaAct(state);
    };

    _proto.startAudioCast = function(){
        var cn, cfg;
        cn = this.connt;
        cfg = this.config;

        if(!this.isRtcReady()){
            console.log('Error','webrtc channel is not ready');
            return;
        }
        if(cfg.oneway){
            cn.emit('media',{room:cfg.room,cmd:'req'});
            this.setMediaAct('pending');
        }else{
            this.startMedia(null,function(err){
                console.log('Error',err);
            });
        }
    };

    _proto.stopAudioCast = function(){
        var cn, cfg, st;
        cn = this.connt;
        cfg = this.config;
        st = this.mediaActive;

        if(cfg.oneway){
            switch(st){
                case 'pending' :
                this.setMediaAct('idle');
                cn.emit('media',{room:cfg.room,cmd:'rls'});
                break;
                case 'active' :
                this.stopMedia();
                this.setMediaAct('idle');
                cn.emit('media',{room:cfg.room,cmd:'rls'});
                break;
            }
        }else{
            this.stopMedia();
            this.setMediaAct('idle');
        }
    };

    _proto.onCastList = function(){};
    _proto.onMediaAct = function(){};


})();

module.exports = medCast;
/* 
* @Author: Phenix Cai
* @Date:   2015-11-13 14:44:49
* @Last Modified time: 2015-11-30 16:57:37
*/
'use strict';
var getUserMedia = require('getusermedia');
var getScreenMedia = require('getscreenmedia');
var localMedia;

(function(){
    var _proto;
    function muteStrm(s){
        if(s)s.getTracks().forEach(function(t){t.stop()});
    }

    //constructor
    function LocalMedia(opts){
        var options, item;
        options = opts || {};
        this.config = {
            media:{
                video: false,
                audio: true
            }
        };

        for(item in options){
            this.config[item] = options[item];
        }
        this.ss = [];

    }

    _proto = LocalMedia.prototype;
    _proto.mute = function(){
        var s = this.lcStrm;
        if(s)muteStrm(s);
    } 
    _proto.start = function (cs, cb){
        var constraints, self;
        self = this;
        constraints = (cs)? cs : this.config.media;
        /*stop previous local medias*/
        this.mute();
        getUserMedia(constraints, function(err,s){
            if(!err){
                self.lcStrm = s;
            }
            if(cb)cb(err,s);
        });
    };
    _proto.stop = function(cb){
        if(cb)cb(this.lcStrm);
        this.mute();
        this.lcStrm =  null;
    };
    _proto.getScn = function(cb){
        var s = this.scnStrm;
        var self = this;
        if(s)muteStrm(s);
        getScreenMedia(function(err,s){
           if(!err){
            self.scnStrm =s;
           } 
           if(cb)cb(err,s);
        });
    };
    _proto.rlsScn = function(cb){
        var s =  this.scnStrm;
        console.log('this.scnStrm ',this.scnStrm);
        if(cb)cb(this.scnStrm);
        if(s)muteStrm(s);
        this.scnStrm = null;
    };
    _proto.getStrms =  function(){
        var ss = [];
        if(this.lcStrm)ss.push(this.lcStrm);
        if(this.scnStrm)ss.push(this.scnStrm);
        return ss;
    };
   
    localMedia = LocalMedia;
})();
module.exports = localMedia;
/* 
* @Author: Phenix Cai
* @Date:   2015-11-13 19:14:00
* @Last Modified time: 2016-01-03 22:04:55
*/

'use strict';
var peerConn = require('./peerconn');


var webRtc;
(function(){
    var _proto, _debug;
    _debug = false;

    function WebRtc(opts){
        
        var options, item, self,  cn;
        self = this;
        options = opts || {};

        this.config = {oneway:true}; 
        this.peers = {};

        for(item in options){
            this.config[item] = options[item];
        }

        this.datChRecvCb = {};
        this.prtypes = {};
    }
    // export obj
    webRtc = WebRtc;
    _proto = WebRtc.prototype;

    //parse signal messages from other peers
    _proto.parseSigMsg = function (msg){
        var id, pc, candidate;
        id = msg.from;
        pc = this.peers[id];
        if(_debug)console.log('Received msg:', msg);

        if (msg.sdp.type === 'offer') {
            //get invite from other side
            this.addPeer(id,'called',msg.sdp);
            
        } else if (msg.sdp.type === 'answer' ) {
            if(!pc){
                console.log("wrong answer id from "+id);
                return;
            }
            pc.setRmtDesc(msg.sdp);
            
        } else if (msg.sdp.type === 'candidate') {
            if(!pc){
                console.log("wrong candidate id from "+id);
                return;
            }
          candidate = new RTCIceCandidate({sdpMLineIndex:msg.sdp.label,
            candidate:msg.sdp.candidate});
          pc.addIceCandidate(candidate);
        } 
    };

    _proto.addPeer = function(id,type,sdp){
        // this._createPeer('calling',id,null);
        var pc, config;
        config = this.config;
        config.id = id;
        config.type = type;
        pc = this.peers[id];
        if(!pc){
            pc = new peerConn(config);
            if(!pc || !pc.peer){
                console.log('erro: create pc failed');
                this.onCrpErro(config);
                return;
            } // create peerconnection error
            this.peers[id] = pc;
            regPconnEvtCb.call(this,pc);
        }
        this.prtypes[id] = type;
        if(type=='called'){
            pc.setRmtDesc(sdp);
            var as =this.ansStrm;
            if(config.oneway == false && as){
                if(as.cmd=='add'){
                    pc.addStream(as.s);
                }else{
                    pc.removeStream(as.s);
                }
            }
            pc.makeAnswer();
        }
    };

    _proto.rmPeer = function(id){
        var pc;
        pc = this.peers[id];
        if(pc){
            pc.close();
            delete this.peers[id];
        }
    };

    _proto.sendData = function(chan,data,to){
        if(to){
            var pc = this.peers[to];
            if(pc)pc.sendData(chan, data);
        }else{
            for(var i in this.peers){
                this.peers[i].sendData(chan,data);
            }
        }
    };

    _proto.startCall = function(id,s){
        var pc = this.peers[id];
        if(!pc){
            console.log('wrong pc from id ',id);
            return;
        }
        if(s)pc.addStream(s);
        pc.makeOffer();
    };

    _proto.stopCall = function(id,s){
        var pc = this.peers[id];
        if(pc){
            if(s)pc.removeStream(s);
            pc.makeOffer();
        }
    };

    _proto.setAnsStrm = function(s,cmd){
        this.ansStrm = {s:s,cmd:cmd};
    };

    _proto.remove = function(id){
        var pc = this.peers[id];
        if(pc){
            pc.close();
            delete this.peers[id];
        }
        var length = 0;
        for(var i in this.peers){length++;}
        return length;
    }


    _proto.createDataChan = function(label,onRecv){
        if(onRecv)this.datChRecvCb[label] = onRecv.bind(this);
        for(var i in this.peers){
            this.peers[i].getDatChan(label);
        }
    };

    _proto.setDCRcvCb = function(label,onRecv){
        this.datChRecvCb[label] = onRecv.bind(this);
    };

    _proto.getprtypes = function(id){
        return this.prtypes[id];
    };


    /*some callback fuctions*/
    _proto.onCmdSend = function(){};
    _proto.onRMedAdd = function(){};
    _proto.onRMedDel = function(){};
    _proto.onCrpErro = function(){};
    _proto.onReady = function(){};


    //internal api for webrtc
    //register callback functions for peerconnections
    function regPconnEvtCb(pc){
        var self = this;
        pc.onCmdSend = function(h,d){
            self.onCmdSend(h,d);
        };
        pc.onDcRecv = function (chan,from,data){
            var hdlData = self.datChRecvCb[chan];
            if(hdlData)hdlData(from,data);
        };
        pc.onAddRStrm = function (s){
            self.onRMedAdd(s);
        };
        pc.onRmRStrm = function(s){
            if(_debug)console.log('rmtStrmDel',s);
            self.onRMedDel(s);
        };
        pc.onConError = function(label,id){
            var config = self.config;
            console.log('peer',id+' connect error');
            self._removePeer(id);
            config.type = 'calling';
            config.id = id;
            self.onCrpErro(config);
        };
        pc.onConnReady = function(label,id){
            var ready = true;
            for(var i in self.peers){
                if(self.peers[i].ready == false){ready=false;break;}
            }
            if(ready)self.onReady();
        }
    };

    function isSdpWithAudio(s){
        var sdps,idx,sdp,ret;
        ret = false;
        sdps =s.split('m=');
        sdps.forEach(function(d){
            sdp = 'm=' +d;
            idx = sdp.search('m=audio');
            if(idx >=0){
                if(sdp.slice(idx).search('a=sendrecv')>=0){
                    ret = true;
                    return;
                }
            }
        });
        return ret;
    }


})();

module.exports = webRtc;


'use strict';

var medCast = require('./mediacast');
var hubCom;

(function(){
	var _proto;
	function extend(func){
			var base = function(){};
			base.prototype = func.prototype;
			return new base();
	}

	//constructor
	function HubCom(opts){

		var self, cn, exPeers;		
		self = this;
		medCast.call(this,opts);

		//extra peer connections for client that does not support webrtc
		exPeers = this.exPeers = [];

		//create extra peers for client that do not support webrtc
		function createExPr(type,id){
			var exPr = self.exPeers[id];
			if(!exPr){
				self.exPeers[id] =  id;
			}
			console.log('crateExPr ',type + 'id ' + id );
			if(type == 'calling'){
				self.socket.emit('msg',{
                    room: self.config.room,
                    to: id,
                    sdp: {type: 'exoffer'},
                    });

			}else{
				self.socket.emit('msg',{
                    room: self.config.room,
                    to: id,
                    sdp: {type: 'exanswer'},
                    });
			}
		}

		function removeExPr(id){
			delete self.exPeers[id];
		}


		function showWebRtcSupport(){
			if(rtcsupport == true){
				self.onWarnMsg('');
			}else{
				self.onWarnMsg('Your browser could not support webrtc, you could not use media casting!');
			}			
		}

		cn = this.connt;

	  /////end of socket msg handler
	  

	} // end of HubCom contructor

	_proto = HubCom.prototype = extend(medCast);


	hubCom =HubCom;

})();


module.exports = hubCom;

var a = 0;
function delay(){
	console.log('enter delay ',a);
	a++;
	if(a < 10){
		setTimeout(delay,1000);
	}else return;
	console.log('leave delay ',a)
}
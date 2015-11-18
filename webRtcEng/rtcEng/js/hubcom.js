'use strict';

var webRtc = require('./webrtc');
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
		webRtc.call(this,opts);

		//extra peer connections for client that does not support webrtc
		exPeers = this.exPeers = [];
		//media casting list
		this.castList = [];
		this.mediaActive = 'idle';

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

		//////////////command for audio casting
		function getMediaCastList(audCon){
			//reset it everytime
			self.castList = [];

			if(audCon.state==1){
				if(audCon.talk == self.config.usrId){
					self.castList[0] = self.config.user + ' talking';
				}else{
					self.castList[0] = self.usrList[audCon.talk] + ' talking';
				}
				
				audCon.que.forEach(function(id){
					if(id == self.config.usrId){
						self.castList[self.castList.length] = self.config.user + ' pending';
					}else{
						self.castList[self.castList.length] = self.usrList[id] + ' pending';
					}
				});
			} 

		}

		function showWebRtcSupport(){
			if(rtcsupport == true){
				self.onWarnMsg('');
			}else{
				self.onWarnMsg('Your browser could not support webrtc, you could not use media casting!');
			}			
		}

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

		cn = this.connt;
		//media casting feature
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


		/////////////// log from server
		cn.on('log', function (array){
		  console.log.apply(console, array);
		});

	  /////end of socket msg handler
	  

	} // end of HubCom contructor

	_proto = HubCom.prototype = extend(webRtc);

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
	//callback functions
	_proto.onCastList = function(){};
	_proto.onMediaAct = function(){};


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
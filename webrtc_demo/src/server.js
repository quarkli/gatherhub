var static = require('node-static');
var http = require('https');
var fs = require('fs');
var options = {
  key: fs.readFileSync('./privatekey.pem'),
  cert: fs.readFileSync('./certificate.pem')
};
var file = new(static.Server)();
var app = http.createServer(options,function (req, res) {
  file.serve(req, res);
}).listen(2013);

//two obj, not array
var rooms = {};
//decriptions or rooms
//there might be serveral different rooms with different name.
//ex. two rooms, one is 'work', the other is 'live'
// rooms = {'work':[sokcet0,socket1,...],'live':[socketA, socketB, ...]}
// if socket1 in 'work' leave the room, the rooms data would be
//{'work':[sokcet0,undefined,socket2,...],'live':[socketA, socketB, ...]}
var nameList = [];
// keep the index for each room
//ex.
// nameList[0] = 'work',nameList[1] = 'live';

// audio manager for each room
var audsMan = {};
//// audoMan = {'work':{state:talk/idle,que:[alice's id, bob's id, ]
/// getFirstId(){return que[0], for other, que[i] = q[i+1]};
///  
///}



function pushNameList(name){
	var index = nameList.indexOf(name);
	if(index<0){
		nameList[nameList.length]=name;
	}
}

function popNameList(name){
	var index = nameList.indexOf(name);
	if(index>=0){
		nameList.splice(index,1);
	}
}
////
function getIdBySocket(room,socket){
	var id;
	for(var i=0;i<room.length;i++){
		if(room[i] && room[i].s == socket){
			id = i;
			break;
		}
	}
	return id;
}

//////////////audio broadcasting manager
function informAudioEvt(room,audCon){
  room.forEach(function (obj) {
		//console.log('informAudioEvt');
    obj.s.emit('media', {cmd: 'update', control: audCon });
  });
}

function parseAudioReq(message,socket){
	var currentRoom = message.room;
	var audCon = audsMan[currentRoom];
	if(!audCon){
		console.log('audsMan:','invalid room'+currentRoom);
	}
	var room = rooms[currentRoom];
	if(!room){
		console.log('room:','invalid room'+currentRoom);
	}
	var id = getIdBySocket(room, socket);
	var cmd = message.cmd;
	//console.log('id:',id);
	if(id!==undefined){
		switch(audCon.state){
			case 0:
				//Idle, 
				if(cmd == 'req'){
					socket.emit('media',{cmd:'ans'});
					audCon.state = 1;
					audCon.talk = id;
				}
			break;
			case 1:
			default:
				if(cmd == 'req'){
					if(audCon.que.indexOf(id)==-1){
						audCon.que.push(id);
					}
				}else if (cmd == 'rls'){
					if(audCon.talk == id){
						//last talk finished..
						if(audCon.que.length > 0){
							//find next talker
							var nxtId = audCon.que.shift();
							audCon.talk = nxtId;
							room[nxtId].s.emit('media',{cmd:'ans'});
						}else{
							audCon.talk = -1;
							audCon.state = 0;
						}
					}else{
						//delete itself from que
						var idx = audCon.que.indexOf(id);
						if(idx >= 0){
							audCon.que.splice(idx,1);
						}
					}
				}
			break;
		}
		//inform all others that audio casting que have changed...
		informAudioEvt(room,audCon);
	}
	
}


var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){

	function log(){
		var array = [">>> "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}

	socket.on('media', function (message) {
		console.log('msg media',message.room,message.cmd);
		parseAudioReq(message,socket);
	});

	socket.on('join', function (data) {

    var currentRoom, id,user;
		if(!data){
			log('could not join a room with empty name!');
			return;
		}
		currentRoom = data.room;
		user = data.user;
		
		var room = rooms[currentRoom];
		

		var numClients =0;

		if(room){
			room.forEach(function(s){
				numClients += 1;
			});
		} 

		log('Room ' + currentRoom + ' has ' + numClients + ' client(s)');
		log('user',user+' enter into '+currentRoom);

		if (numClients == 0){
			//free previous room
			if(room){
				delete(room);
			}
			rooms[currentRoom] = [{s:socket,u:user}];
			//init audio manager
			audsMan[currentRoom] ={state:0,talk:-1,que:[]};
      console.log('Room created, with name', currentRoom);
			id = 0;
			//do you want send back to client something...
		} else {
			//io.sockets.in(data).emit('joined', {id:socket.id});
			//socket.join(data);
      id = room.length;
      room.forEach(function (obj) {
        obj.s.emit('joined', { id: id });
      });
      room[id] = {s:socket,u:user};
      console.log('Peer connected to room', currentRoom, 'with #', id);			
		} 

		pushNameList(currentRoom);
		socket.emit('connected',{id:id});

	});


    socket.on('msg', function (data) {
    	var currentRoom = data.room;
			if(!currentRoom){
				log("wrong room name!");
				return;
			}
      var to = parseInt(data.to, 10);
			var room = rooms[currentRoom];
			if(!room){
				log("undefined rooms");
				return;
			}

			var from = getIdBySocket(room,socket);
			//console.log('recv msg in',room + 'from ' + from + 'to' + to);
			
      if (from!=undefined && room[to]) {
        //log('from '+from+'Redirecting message to', to);
        room[to].s.emit('msg', {from:from,usr:room[from].u,sdp:data.sdp});
      } else {
        log('Invalid user');
      }
    });

    socket.on('disconnect', function () {
			/*this message is send by io.socket automatically
				we have to search each room and each socket to find 
				which socket in which room disconnect, and inform the other sockets
				in that room 
			*/
			nameList.forEach(function(r){
				var from;
				room = rooms[r];
				//find id index should not use forEach, it will skip undefined automatically
				from = getIdBySocket(room,socket);
				//send socket leave msg to other sockets in the room
				if(from!=undefined){
					//if there is audio con que here
					var message = {room:r,cmd:'rls'};
					parseAudioReq(message,socket);
					console.log('socket leaved ','id='+from +' from room '+r);
					delete room[from];
					room.forEach(function (obj) {
        		obj.s.emit('bye', { id: from });
      		});
					return;
				}
			});
			
			
    });


});



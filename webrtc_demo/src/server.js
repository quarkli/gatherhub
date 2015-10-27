var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
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


var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){

	function log(){
		var array = [">>> "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}


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
      console.log('Room created, with name', currentRoom);
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

			var from;
			for(var i=0;i<room.length;i++){
				if(room[i] && room[i].s == socket){
					from = i;
					break;
				}
			}
			
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
			var currentRoom;
			var id;
			nameList.forEach(function(r){
				id = 0;
				room = rooms[r];
				//find id index should not use forEach, it will skip undefined automatically
				for(var i=0;i<room.length;i++){
					if(room[i] && room[i].s === socket){
						currentRoom = room;
						console.log("find socket in "+r+" leaved!");
						flag =1;
						break;
					}
					id += 1;
				}
				//send socket leave msg to other sockets in the room
				if(currentRoom){
					console.log("socket in room "+r+" leaved!");
					delete room[id];
					room.forEach(function (obj) {
        		obj.s.emit('bye', { id: id });
      		});
					return;
				}
			});
			
			
    });


});


var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(2013);
// test
//two obj, not array
var rooms = {},
    userIds = {};
var nameList = [];

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

    var currentRoom, id;
		if(!data){
			log('could not join a room with empty name!');
			return;
		}
		currentRoom = data;
		var room = rooms[currentRoom];
		

		var numClients =0;

		if(room){
			room.forEach(function(s){
				numClients += 1;
			});
		} 

		log('Room ' + currentRoom + ' has ' + numClients + ' client(s)');
		log('Request to create or join room', currentRoom);

		if (numClients == 0){
			//socket.join(data);
			rooms[currentRoom] = [socket];
			id = userIds[currentRoom] = 0;
      console.log('Room created, with #', currentRoom);
			//do you want send back to client something...
		} else {
			//io.sockets.in(data).emit('joined', {id:socket.id});
			//socket.join(data);
      userIds[currentRoom] += 1;
      id = userIds[currentRoom];
      room.forEach(function (s) {
        s.emit('joined', { id: id });
      });
      room[id] = socket;
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
			var from = rooms[currentRoom].indexOf(socket);
      if (rooms[currentRoom] && rooms[currentRoom][to]) {
        log('from '+from+'Redirecting message to', to);
        rooms[currentRoom][to].emit('msg', {from:from,sdp:data.sdp});
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
			var currentRoom = null;
			var id;
			nameList.forEach(function(r){
				id = 0;
				room = rooms[r];
				//find id index should not use forEach, it will skip undefined automatically
				for(var i=0;i<room.length;i++){
					if(room[i]==socket){
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
					room.forEach(function (s) {
        		s.emit('bye', { id: id });
      		});
					return;
				}
			});
			
			
    });


});


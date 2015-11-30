var static = require('node-static');
var http = require('https');
var fs = require('fs');
var options = {
  key: fs.readFileSync('./fakekey/privatekey.pem'),
  cert: fs.readFileSync('./fakekey/certificate.pem')
};
var file = new(static.Server)();
var app = http.createServer(options,function (req, res) {
  file.serve(req, res);
}).listen(2013);

//obj, not array
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
		nameList.push(name);
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


var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){

	function log(){
		var array = ["[srv]"];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}

	function infError(m){
		socket.emit('err',m);
	}


	socket.on('join', function (data) {

    var index, id, user, rtc;
		if(!data){
			log('could not join a room with empty name!');
			return;
		}
		index = data.room;
		user = data.user;
		rtc = data.rtc;
		
		var room = rooms[index];
		

		var numClients =0;

		if(room){
			room.forEach(function(s){
				numClients += 1;
			});
		} 

		log('Room ' + index + ' has ' + numClients + ' client(s)');
		log('user',user+' enter into '+index);

		if (numClients == 0){
			//free previous room
			if(room){
				delete(room);
			}
			rooms[index] = [{s:socket,u:user}];
			//init audio manager
      		console.log('Room created, with name', index);
			id = 0;
			//do you want send back to client something...
		} else {
			//io.sockets.in(data).emit('joined', {id:socket.id});
			//socket.join(data);
      		id = room.length;
      		room.forEach(function (obj) {
        		obj.s.emit('joined', { id: id, rtc: rtc});
      		});
      		room[id] = {s:socket,u:user};
      		console.log('Peer connected to room', index, 'with #', id);			
		} 

		pushNameList(index);
		socket.emit('connected',{id:id});

	});


	function parseMessage(type,data,socket){
		var  roomIdx, to, room, from;
    	roomIdx = data.room;
		if(!roomIdx){
			log("wrong room name!");
			return ;
		}
		room = rooms[roomIdx];
		if(!room){
			log("undefined rooms");
			return ;
		}

      	to = parseInt(data.to, 10);
      	if(!room[to]){
			log("undefined sokcet");
			return ;
		}
		
		from = getIdBySocket(room,socket);
		if(from == undefined){
        	log('Invalid user');
        	infError('con-lost');
			return ;
		}

		if(type == 'msg'){
        	room[to].s.emit('msg', {from:from,usr:room[from].u,mid:data.mid,sdp:data.sdp});
		}else if (type == 'dat'){
			console.log('dat','fromn'+from+'data',data.dat);
        	room[to].s.emit('dat', {from:from,dat:data.dat});
		}

	}


    socket.on('msg', function (data) {
    	parseMessage('msg',data,socket);
    });

    socket.on('dat', function (data) {
    	parseMessage('dat',data,socket);
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



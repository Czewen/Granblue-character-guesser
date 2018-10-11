var express = require('express');
var router = express.Router();
var pgp = require('pg-promise')(/*options*/)
// var db = pgp('postgres://Cze Wen:admin@localhost:5432/granblue')
var db = pgp('postgres://Cze Wen:admin@localhost:5432/granblue')
var rooms = require('./globalArr');

const capacity_error_code = 23514;

const EventEmitter = require('events');
class MyEmitter extends EventEmitter {};

const myEmitter = new MyEmitter();

//init rooms for now
db.any('SELECT * FROM rooms')
.then(function(data) {
    for(var i = 0; i< data.length; i++){
    	var newRoom = new Room(data[i].id, data[i].owner)
    	rooms[newRoom.id] = newRoom;
    }
    console.log("Init rooms: ");
    console.log(rooms);

    //set some dummy scores for testing
    var testRoom = rooms["HOWDY"];
	testRoom.owner = "Lecia";
	testRoom.playerScores["Lecia"] =  10;
	testRoom.playerScores["Song"] = 10;
})
.catch(function(error) {
    // error;
    console.log("failed to init rooms");
    console.log(error);

});

//testing purposes
myEmitter.on("event", function(updateType, roomInfo){
	console.log("Called event handler");
	var clients = roomInfo.clients;
	if(updateType == 'scores'){
		console.log("sending data from event handler");
		console.log("roomInfo: ", roomInfo);
		var clientNames = Object.keys(clients);
		for(let name of clientNames){
			var res = clients[name];
			var content = 'data: ' + JSON.stringify(roomInfo.playerScores);
			res.write(content);
			res.write('\n\n');
			console.log("sent: ", content);
		}
	}
})

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function Room(id, owner){
	this.id = id;
	this.owner = owner;
	this.playerScores = {};
	this.clients = {};
}

router.get('/', function(req, res, next) {
	db.any('SELECT * FROM rooms')
    .then(function(data) {
        // success;
        console.log(data);
        console.log('Data length:', data.length);
        console.log('Data id', data[0].id);
        console.log(rooms);

        res.json(data);
    })
    .catch(function(error) {
        // error;
        console.log(error);
    });
    
});

router.post('/create', function(req, res, next){
	console.log(req.body);
	var body = req.body;
	var newRoomId = makeid();
	var query = 'INSERT INTO ROOMS(id, curr_capacity, max_capacity, closed, difficulty, owner)' 
				+ 'VALUES($1, 1, $2, FALSE, $3, $4)';	
	db.any(query, [newRoomId, body.capacity, body.difficulty, body.owner])
	.then(function(data){
		console.log("INSERT SUCCESS: " ,data);
		console.log("Creating room with id: ", newRoomId);
		var newRoom = new Room(newRoomId, body.owner);
		rooms[newRoom.id] = newRoom;
		newRoom.playerScores[body.owner] = 0;
		var roomIds = Object.keys(rooms);
		console.log(roomIds);
		res.status(201).json({'success': true, 'room_id': newRoomId});

		myEmitter.on('event', function(updateType, roomInfo){
			var clients = roomInfo.clients;
			if(updateType == 'scores'){
				var clientNames = Object.keys(clients);
				for(let name of clientNames){
					console.log("Event handler from create");
					var clientRes = clients[name];
					var content = 'data: ' + JSON.stringify(roomInfo.scores);
					clientRes.write(content + "\n\n");
				}
			}
		})
	})
	.catch(function(error){
		console.log("INSERT FAIL:", error);
		res.status(201).json({'success': false});
	})
});

router.post('/join', function(req, res, next){
	if(req.body == undefined || req.body.length == 0){
		console.log("Bad request 1");
		return res.status(400).send('Bad Request');
	}

	if(req.query.room_id == undefined || req.query.username == undefined){
		console.log(req.query);
		console.log("room_id undefined?", req.body.room_id == undefined);
		console.log("username undefined?", req.body.username == undefined);
		console.log("Bad request 2");
		return res.status(400).send('Bad Request');
	}

	var room_id = req.query.room_id;
	db.result('UPDATE rooms SET curr_capacity=curr_capacity+1 WHERE id=$1', [room_id], r => r.rowCount)
    .then(count => {
       // count = number of rows affected (updated or deleted) by the query
       	console.log("count: ", count);
       	if(count == 0){
       		var message = "Room with ID: " + room_id + " not found.";
       		return res.status(201).send({"error": true, "message": message});
       	}

       	rooms[room_id].playerScores[req.query.username] = 0;
       	console.log(rooms[room_id]);
       	return res.status(201).send('OK');

    })
    .catch(error => {
    	console.log(error);
    	if(error.code == capacity_error_code){
    		return res.status(201).send({"error": true, "message": "Room full."});
    	}
    	return res.status(500).send();
    });

	// db.any('UPDATE rooms SET curr_capacity=curr_capacity+1 WHERE id=$1', [req.query.room_id])
	// .then(function(data){
	// 	console.log("join room pass");
	// 	console.log(data);
	// })
	// .catch(function(error){
	// 	console.log("join room fail");
	// 	console.log(error);
	// })
});

router.get('/room', function(req, res, next){
	if(req.query.room_id == undefined || req.query.username == undefined){
		res.status(400).end();
	}
	else{
		console.log("Requested room: ", req.query.room_id);
		console.log("room: ", rooms[req.query.room_id]);
		var room = rooms[req.query.room_id];
		var resObj = {
			'id': room.id,
			'owner': room.owner,
			'playerScores': room.playerScores
		}
		res.json(resObj);
	}
})

router.get('/eventstream', function(req, res, next){
	var roomInfo = rooms[req.query.room_id];
	var username = req.query.username;
	console.log("In eventstream endpoint");
	console.log("register eventstream for room: ", req.query.room_id);
	console.log(req.query);
	if(roomInfo != undefined){
		res.writeHead(200, {
	      'Connection': 'keep-alive',
	      'Content-Type': 'text/event-stream',
	      'Cache-Control': 'no-cache'
	    });

	    roomInfo.clients[username] = res;
	    console.log("Registered user in eventstream: ", username);
	    var c = Object.keys(roomInfo.clients);
	    console.log("clients: ", c);
	}
})

router.get('/testupdatescore', function(req, res, next){
	var roomId = req.query.room_id;
	var username = req.query.username;

	var room = rooms[roomId];
	room.playerScores[username] = 9999;
	console.log("Try to emit event");
	myEmitter.emit('event', 'scores', room);

	res.status(200).end()
})

module.exports = router;


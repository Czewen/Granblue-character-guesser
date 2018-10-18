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
myEmitter.on('event', handleEvent);

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
// myEmitter.on("event", function(updateType, roomInfo){
// 	console.log("Called event handler");
// 	var clients = roomInfo.clients;
// 	if(updateType == 'scores'){
// 		console.log("sending data from event handler");
// 		console.log("roomInfo: ", roomInfo);
// 		var clientNames = Object.keys(clients);
// 		for(let name of clientNames){
// 			var res = clients[name];
// 			var dataObj = {'eventType': 'scores', 'playerScores': roomInfo.playerScores};
// 			var content = 'data: ' + JSON.stringify(dataObj);
// 			res.write(content);
// 			res.write('\n\n');
// 			console.log("sent: ", content);
// 		}
// 	}
// })

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
	this.hasAnswered = [];
	this.currCapacity = 0;
	this.currentQuestion;
}

function handleEvent(updateType, roomInfo){
	var clients = roomInfo.clients;
	var clientNames = Object.keys(clients);
	console.log('handling event: ', updateType);
	var dataObj;
	// if(updateType === 'scores'){
	// 	console.log("Sending new scores for room: ", roomInfo.id);
	// 	dataObj = {'eventType': 'scores', 'playerScores': roomInfo.playerScores};
	// }
	// else if(updateType === 'disconnect'){
	// 	dataObj = {'eventType': 'disconnect'};
	// }
	// else if(updateType === 'startGame'){
	// 	dataObj = {'eventType': 'startGame'};
	// }

	switch(updateType){
		case 'scores':
			console.log("Sending new scores for room: ", roomInfo.id);
			dataObj = {'eventType': 'scores', 'playerScores': roomInfo.playerScores};
			break;
		case 'disconnect':
			dataObj = {'eventType': 'disconnect'};
			break;
		case 'startGame':
			dataObj = {'eventType': 'startGame'};
			break;
		default:
			dataObj = {'eventType': 'unknown event'};
	}

	for(let name of clientNames){
		console.log("Sending event to: ", name);
		var clientRes = clients[name];
		var content = 'data: ' + JSON.stringify(dataObj);
		clientRes.write(content + "\n\n");
	}

	if(updateType === 'disconnect'){
		delete rooms[roomInfo.id];
	}
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
		newRoom.currCapacity = 1;
		// var roomIds = Object.keys(rooms);
		// console.log(roomIds);
		res.status(201).json({'success': true, 'room_id': newRoomId});
	})
	.catch(function(error){
		console.log("INSERT FAIL:", error);
		res.status(500).end();
	})
});

router.put('/join', function(req, res, next){
	if(req.body == undefined || req.body.length == 0){
		console.log("Bad request 1");
		return res.status(401).send('Bad Request');
	}

	if(req.query.room_id == undefined || req.query.username == undefined){
		console.log(req.query);
		console.log("room_id undefined?", req.body.room_id == undefined);
		console.log("username undefined?", req.body.username == undefined);
		console.log("Bad request 2");
		return res.status(401).send('Bad Request');
	}

	var room_id = req.query.room_id;
	db.result('UPDATE rooms SET curr_capacity=curr_capacity+1 WHERE id=$1', [room_id], r => r.rowCount)
    .then(count => {
       // count = number of rows affected (updated or deleted) by the query
       	console.log("count: ", count);
       	if(count == 0){
       		var message = "Room with ID: " + room_id + " not found.";
       		return res.status(200).send({"error": true, "message": message});
       	}

       	rooms[room_id].playerScores[req.query.username] = 0;
       	rooms[room_id].currentCapacity++;
       	console.log(rooms[room_id]);
       	myEmitter.emit('event', 'scores', rooms[room_id]);
       	return res.status(200).send('OK');

    })
    .catch(error => {
    	console.log(error);
    	if(error.code == capacity_error_code){
    		return res.status(200).send({"error": true, "message": "Room full."});
    	}
    	return res.status(500).send();
    });
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

router.post('/startGame', function(req, res, next){
	if(req.query.room_id == undefined || req.query.username == undefined){
		res.status(400).end();
	}
	else{
		var roomId = req.query.room_id;
		myEmitter.emit('event', 'startGame', rooms[roomId]);
		res.status(200).send('OK');
	}
})

router.get('/eventstream', function(req, res, next){

	if(req.query.room_id === undefined || req.query.username === undefined){
		res.status(401).end()
		return;
	}

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

router.post('/leave', function(req, res, next){

	if(req.query.room_id === undefined || req.query.username === undefined){
		res.status(401).end()
		return;
	}
	
	var room_id = req.query.room_id;
	var roomInfo = rooms[room_id];
	var username = req.query.username;

	if(roomInfo != undefined){
		if(username === roomInfo.owner){
				//signal that room's closed to other players
			var query =  'DELETE FROM rooms where id=' + room_id;
			console.log("Delete query: ", query);
			db.result('DELETE FROM rooms WHERE id=$1', [room_id], r => r.rowCount)
				.then(count => {
					if(count == 0){
						var message = "Room with ID: " + room_id + " not found.";
						res.status(200).send({"error": true, "message": message});
					}
					myEmitter.emit('event', 'disconnect', roomInfo);
					res.status(200).send('OK');
				})
				.catch(error => {
					console.log(error);
					res.status(500).end();
				})

			db.result('DELETE FROM questions WHERE roomid=$1', [room_id], r => r.rowCount)
				.then(count =>{
					if(count === 0){
						console.log("No questions found for questions with roomid: ", room_id);
					}
					else{
						console.log("Number of questions deleted: ", count);
					}
				})
				.catch(function(error){
					console.log("Failed to deltete questions");
					console.log(error);
				})

		}
		else{
			db.result('UPDATE rooms SET curr_capacity=curr_capacity-1 WHERE id=$1', [room_id], r => r.rowCount)
		    .then(count => {
		       // count = number of rows affected (updated or deleted) by the query
	       	console.log("count: ", count);
	       	if(count == 0){
	       		var message = "Room with ID: " + room_id + " not found.";
	       		return res.status(200).send({"error": true, "message": message});
	       	}

	       	console.log("deleting: ", username);
	       	delete roomInfo.playerScores[username];
	       	delete roomInfo.clients[username];
	       	roomInfo.currentCapacity--;
	       	console.log("players left: ", roomInfo.playerScores);
	       	var clientNames = Object.keys(roomInfo.clients);
	       	console.log("clients left: ", clientNames );
	       	myEmitter.emit('event', 'scores', roomInfo);
	       	return res.status(200).send('OK');
		    })
		    .catch(error => {
		    	console.log(error);
		    	if(error.code == capacity_error_code){
		    		return res.status(200).send({"error": true, "message": "Room full."});
		    	}
		    	return res.status(500).send();
		    });
		  }
		}
})

router.get('/createQuestion', function(req, res, next){
	if(req.query.room_id === undefined || req.query.username === undefined){
		res.status(401).end()
		return;
	}

	var roomInfo = rooms[roomId];
	if(roomInfo === undefined){
		var errMsg = 'Room with ID: ' + roomId + ' doesnt exist';
		res.status(401).send(errMsg);
	}		
	//for testing purposes, character_id = 1 (will be randomized in the future)
	var query = 'INSERT INTO QUESTIONS(roomId, username, character_id)'
				+ 'VALUES($1, $2, $3)';
	var roomId = req.query.room_id;
	var username = req.query.username;
	var round = room.round;
	db.result(query, [roomId, username, 1], r => r.rowCount)
		.then(count => {
				if(count === 0){
					res.status(200).json({'error': true, 'message': 'Error occurred when trying to create question'});
				}
				else{
					res.status(200).send('OK');
				}
		})
		.catch(function(error){
				console.log(error);
				res.status(500).end();
		})
})

router.post('/submitDescription', function(req, res, next){
	if(req.body.questionId === undefined){
		res.status(401).end()
		return;
	}

	var questionId = req.query.questionId;
	var username = req.query.username;

	db.result('UPDATE questions SET answer=$1 WHERE id=$2', [room_id], r => r.rowCount)
	.then(count => {
		if(count === 0 ){
			var errMsg = 'Could not find question with ID: ' + questionId
			res.status(200).json({'error': true, 'message': errMsg});
		}
		else{
			res.status(200).json('OK');
		}
	})
	.catch(function(error){
			console.log(error);
			res.status(500).end();
	})
})

router.post('/submitAnswer', function(req, res, next){
	if(req.body.question_id === undefined || req.body.room_id === undefined
			|| req.body.username === undefined){
		console.log(req.body);
		res.status(401).end();
		return;
	}

	var roomInfo = rooms[req.body.room_id];
	var questionId = req.body.question_id;
	var answer = req.body.answer;
	var username = req.body.username;

	if(roomInfo.hasAnswered[username] != undefined){
		var msg = 'You have answered this question before already.';
		res.status(200).json({'sucess': false, "message": msg});
	}
	// else if(questionId != roomInfo.currentQuestion){
	// 	var msg = 'Question with ID: ' + questionId + ' has already expired.';
	// 	res.status(200).json({'sucess': false, "message": msg});
	// }

	var questionQuery = 'SELECT username, character_id from Questions where id=$1';
	db.task(t => {
		return t.one(questionQuery, questionId)
			.then(question => {
				if(question){
					console.log("Executed first query...");
					console.log(question);
					return t.any('SELECT * FROM characters where character_id=${character_id}', question)
						.then(character => {
							return {'questionOwner': question.username, 'characterName': character.name};
						})
						.catch(error => {
							console.log("Second query: " ,error);
						})
				}
				console.log("Returning empty");
				return [];
			})
			.catch(error => {
				console.log("First query: ", error);
			})
	})
	.then(result => {
		// var question = result.question;
		// var character = result.character;
		roomInfo.hasAnswered[username] = true;
		if(answer === result.characterName){
			roomInfo.playerScores[username]+=1000;
			roomInfo.playerScores[result.questionOwner]+=1500;
		}

		if(Object.keys(roomInfo.hasAnswered).length === )

		res.status(200).json('OK');
		console.log(result);
	})
	.catch(error => {
		console.log(error);
	});
})

router.post('/testBody', function(req, res, next){
	console.log(req.body);
	res.status(200).send('OK');
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


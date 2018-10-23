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

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 8; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function Room(id, owner){
	this.id = id;
	this.owner = owner;
	this.playerScores = {};
	this.clients = {};
	this.hasSubmitted = [];
	this.currCapacity = 0;
	this.currentRound = 0;
	this.maxRounds = 1;
	this.gameState = "lobby";
	this.questionIds = [];
	this.currentQuestion = {};
}

function handleEvent(updateType, roomInfo){
	var clients = roomInfo.clients;
	var clientNames = Object.keys(clients);
	console.log('handling event: ', updateType);
	var dataObj;

	var sendToClientsCallback = function(dataObj){
		for(let name of clientNames){
			console.log("Sending event to: ", name);
			var clientRes = clients[name];
			var content = 'data: ' + JSON.stringify(dataObj);
			clientRes.write(content + "\n\n");
		}
	}

	switch(updateType){
		case 'scores':
			console.log("Sending new scores for room: ", roomInfo.id);
			dataObj = {'eventType': 'scores', 'playerScores': roomInfo.playerScores};
			break;
		case 'disconnect':
			dataObj = {'eventType': updateType};
			break;
		case 'startGame':
			dataObj = {'eventType': updateType};
			roomInfo.gameState = "question";
			break;
		case 'startAnswerRound':
			roomInfo.gameState = "answer";
			dataObj = {'eventType': updateType};
			selectNextQuestion(roomInfo, sendToClientsCallback);
			return;
		case 'startQuestionRound':
			roomInfo.round++;
			if(roomInfo.round <= roomInfo.maxRounds){
				roomInfo.gameState = "question";
				prepareQuestions(roomInfo, sendToClientsCallback);
				return;
			}
		case 'endGame':
			dataObj = {'eventType': updateType, playerScores: roomInfo.playerScores};
			break;
		case 'nextQuestion':
			selectNextQuestion(roomInfo, sendToClientsCallback);
			return;
		default:
			dataObj = {'eventType': 'unknown event'};
	}

	sendToClientsCallback(dataObj);

	if(updateType === 'disconnect' || updateType === 'endGame'){
		delete rooms[roomInfo.id];
	}
}

function prepareQuestions(roomInfo, callback){
	var questions = [];
	var users = Object.keys(roomInfo.playerScores);
	for(user of users){
		//should be randomized but for testing purposes, we'll just use 1
		var character_id = 1;
		questions.push({"roomid": roomInfo.id, "username": user,"character_id": character_id, "round": roomInfo.currentRound});
	}
	console.log(questions);
	//var values = new Inserts('${roomId}, ${username}, ${character_id}, ${round}', questions);
	var query = pgp.helpers.insert(questions, ['roomid', 'username', 'character_id', 'round'], 'questions') + " RETURNING id";
	console.log(query);
	db.result(query)
		.then(result => {
			console.log(result);
			var dataObj = {'eventType': 'newQuestionRound', currentRound: roomInfo.round};
			for( row of result.rows){
				roomInfo.questions.push(row.id);
			}
			callback(dataObj);
		})
		.catch(error => {
			console.log(error);
		})
}

function createQuestion(roomId, round, username){
	var query = 'INSERT INTO QUESTIONS(roomId, username, character_id, round)'
				+ 'VALUES($1, $2, $3) RETURNING id';
	//for testing purposes, character_id = 1 (will be randomized in the future)
	var character_id = 1;

	db.result(query, [roomId, username, character_id, round])
		.then(result => {
				if(result.count === 0){
					res.status(200).json({'error': true, 'message': 'Error occurred when trying to create question'});
				}
				else{
					console.log(result);
				}
		})
		.catch(function(error){
				console.log(error);
				res.status(500).end();
		})
}

function selectNextQuestion(roomInfo, callback){
	if(roomInfo.questionIds.length > 0)
		var nextQuestionId = roomInfo.questionIds.shift();

		var query = 'SELECT questions.id, questions.username, characters.* '
			+ 'FROM questions, characters where questions.id=$1';
		db.one(query, nextQuestionId)
		.then(result => {
			roomInfo.currentQuestion = {
				"question": 
				{
					'id': result.id,
					'username': result.username
				},
				'character':
				{
					'character_id': result.character_id,
					'name': result.name,
					'race': result.race,
					'weapon': result.weapon,
					'story_exclusive': result.story_exclusive,
					'restricted_words': result.restricted_words
				}
			};

		var dataObj = {eventType: 'nextQuestion', playerScores: roomInfo.playerScores};
		callback(dataObj);
	})
	.catch(error => {
			//skip over this question if there was an error
		console.log(error);
		if(roomInfo.questionIds.length === 0){
			myEmitter.emit('event', 'startAnswerRound', roomInfo);
		}
		else{
			myEmitter.emit('event', 'selectNextQuestion', roomInfo);
		}
	})
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
	var max_rounds = 2;
	var query = 'INSERT INTO ROOMS(id, curr_capacity, max_capacity, closed, difficulty, owner, max_rounds)' 
				+ 'VALUES($1, 1, $2, FALSE, $3, $4, $5)';	
	db.any(query, [newRoomId, body.capacity, body.difficulty, body.owner,max_rounds])
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
	var roomInfo = rooms[room_id];

	if(roomInfo === undefined){
		res.status(200).send({'error': true, 'exists': false});
		return;
	}
	else if(roomInfo.gameState != 'lobby'){
		res.status(200).send({'error': true, 'gameStarted': true});
	}

	db.result('UPDATE rooms SET curr_capacity=curr_capacity+1 WHERE id=$1 AND ', [room_id], r => r.rowCount)
    .then(count => {
       // count = number of rows affected (updated or deleted) by the query
       	console.log("count: ", count);
       	if(count == 0){
       		res.status(200).send({'error': true, 'exists': false});
					return;
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
		myEmitter.emit('event', 'startQuestionRound', rooms[roomId]);
		res.status(200).send('OK');
	}
})

router.get('/getGameState', function(req, res, next){
	if(req.query.room_id === undefined){
		res.status(400).end();
	}

	var roomInfo = rooms[req.query.room_id];
	if(roomInfo === undefined){
		var msg = 'Room with ID: ' + req.query.room_id + ' does not exist.';
		res.status(200).json({error: true, message: msg});
	}

	if(roomInfo.gameState === 'lobby' || roomInfo.gameState === 'question'
			|| roomInfo.gameState === 'answer')
	{
		res.status(200).json({gameState: roomInfo.gameState});
	}
	else{
		console.log("Unknown game state: ", roomInfo.gameState);
	}

})

router.get('/eventstream', function(req, res, next){

	if(req.query.room_id === undefined || req.query.username === undefined){
		res.status(400).end()
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
		res.status(400).end()
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

router.get('/roomQuestion', function(req, res, next){
	if(req.query.room_id === undefined){
		res.status(400).end();
	}

	var roomInfo = req.query.room_id;
	if(roomInfo === undefined){
		var errMsg = 'Could not find question with ID: ' + questionId
			res.status(200).json({'error': true, 'message': errMsg});
	}
	
	res.status(200).json(roomInfo.currentQuestion);
})

router.get('/getMyQuestion', function(req, res, next){
	if(req.query.username === undefined || req.query.room_id === undefined
			|| req.query.round === undefined){
		res.status(400).end();
	}

	var round = req.query.round;
	var username = req.query.username;
	var roomId = req.query.room_id;

	var roomInfo = rooms[roomId];

	//for testing only, will be removed 
	if(req.query.special != undefined){
		roomInfo.currentRound = req.query.special;	
	}

	if(roomInfo === undefined){
		res.status(200).json({'error': true, 'roomExists': false})
	}
	else if(round != roomInfo.currentRound){
		res.status(200).json({'error': true, 'expired': true })
	}

	db.one('SELECT questions.id, characters.* from questions, characters where questions.roomId=${room_id} AND username=${username} AND round=${round}', req.query)
		.then(result => {
			res.status(200).json({
				"question": 
				{
					'id': result.id,
					'username': result.username
				},
				'character':
				{
					'character_id': result.character_id,
					'name': result.name,
					'race': result.race,
					'weapon': result.weapon,
					'story_exclusive': result.story_exclusive,
					'restricted_words': result.restricted_words
				}
			})
		})
		.catch(error => {
			console.log(error);
		})

	
})

router.post('/submitDescription', function(req, res, next){
	if(req.body.questionId === undefined || req.body.room_id === undefined
			|| req.body.answer === undefined){
		res.status(400).end()
		return;
	}

	var questionId = req.body.questionId;
	var username = req.body.username;
	var roomInfo = rooms[req.body.room_id];

	if(roomInfo === undefined){
		res.status(200).json({'error': true, 'questionExists': false});
	}

	if(roomInfo.hasSubmitted[username] != undefined){
		res.status(200).json({'error': true, 'repost': true});
	}

	db.result('UPDATE questions SET answer=${answer} WHERE id=${questionId}', req.body, r => r.rowCount)
	.then(count => {
		if(count === 0 ){
			res.status(200).json({'error': true, 'questionExists': false});
		}
		else{
			res.status(200).json('OK');
			roomInfo.hasSubmitted[username] = true;

			if(Object.keys(roomInfo.hasSubmitted).length === roomInfo.currentCapacity){
				roomInfo.hasSubmitted= {};
				myEmitter.emit('event', 'startAnswerRound', roomInfo);
			}
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
		res.status(400).end();
		return;
	}

	var roomInfo = rooms[req.body.room_id];
	var questionId = req.body.question_id;
	var answer = req.body.answer;
	var username = req.body.username;

	if(roomInfo.gameState != 'answer'){
		res.status(200).json({'error': true, 'expired': true});
	}

	if(roomInfo.hasSubmitted[username] != undefined){
		res.status(200).json({'error': true, 'repost': true});
	}
	// else if(questionId != roomInfo.currentQuestion.id){
	// 	var msg = 'Question with ID: ' + questionId + ' has already expired.';
	// 	res.status(200).json({'sucess': false, "message": msg});
	// }
	var currentQuestion = roomInfo.currentQuestion;
	roomInfo.hasSubmitted[username] = true;
		if(currentQuestion.character.name === result.characterName){
			roomInfo.playerScores[username]+=1000;
			roomInfo.playerScores[result.questionOwner]+=1500;
		}

		if(Object.keys(roomInfo.hasSubmitted).length === roomInfo.currentCapacity){
			roomInfo.hasSubmitted = {};
			myEmitter.emit('event', 'nextQuestion', roomInfo);

		}
})

router.post('/testPrepareQuestions', function(req, res, next){
	var roomId = req.body.room_id;
	var dummyFunc = () => {
		return 1;
	}
	prepareQuestions(rooms[roomId], dummyFunc);
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


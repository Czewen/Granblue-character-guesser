var express = require('express');
var cors = require('cors');
var router = express.Router();
var pgp = require('pg-promise')(/*options*/)
// var db = pgp('postgres://Cze Wen:admin@localhost:5432/granblue')
var globalVals = require('./globalVals');
// var db = pgp('postgres://Cze Wen:admin@localhost:5432/granblue')
var db = globalVals.dbInstance;
var rooms = require('./globalArr');

const capacity_error_code = 23514;

const EventEmitter = require('events');
class MyEmitter extends EventEmitter {};

const myEmitter = new MyEmitter();
myEmitter.on('event', handleEvent);

/************************** SETUP ***************************************/
var numCharacters = 1;
db.one('SELECT COUNT(*) FROM characters')
.then(result => {
  numCharacters = result.count;
})
.catch(error => {
  console.log("Tried to retrieve count of characters: ", error);
})

var minutesInMs = 60 * 1000;
var clearOldRooms = setInterval(deleteOldRooms, 5 * minutesInMs);
/***********************************************************************/

function getRandomCharacterId(){
  return Math.floor(Math.random() * Math.floor(numCharacters)) + 1;
}

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 8; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function deleteOldRooms(){
  // console.log("Called deleteOldRooms");

  // db.task(t => {
  //   return t.any("UPDATE rooms SET closed=true where created + interval '1h' < now()")
  //     .then(result => {
  //       return t.any("DELETE FROM rooms where closed=true RETURNING *");
  //     })
  // })
  // .then(deletedRooms => {
  //   for(var room of deletedRooms){
  //     rooms[room.id] = undefined;
  //   }
  // })
  // .catch(error => {
  //   console.log("DeleteOldRooms error: ", error);
  // })
  db.any("DELETE FROM rooms where created + interval '1h' < now() OR closed=true RETURNING *")
  .then(result => {
    for(var i = 0; i<result.length; i++){
      var room = result[i];
      // console.log("DELETING ROOM WITH ID: ", room.id);
      rooms[room.id] = undefined
    }
  })
  .catch(error => {
    console.log("Failed to delete old rooms: ", error);
  })
}

function Room(id, owner){
	this.id = id;
	this.owner = owner;
	this.playerScores = {};
	this.clients = {};
	this.hasSubmitted = [];
	this.currCapacity = 0;
  this.maxCapacity = 2;
	this.currentRound = 0;
	//default max rounds
	this.maxRounds = 4;
	this.gameState = "lobby";
	this.questionIds = [];
	this.currentQuestion = {};
}

function handleEvent(updateType, roomInfo){
	var clients = roomInfo.clients;
	var clientNames = Object.keys(clients);
	// console.log('handling event: ', updateType);
	var dataObj;

	var sendToClientsCallback = function(dataObj){
		for(let name of clientNames){
			// console.log("Sending event to: ", name);
			var clientRes = clients[name];
			var content = 'data: ' + JSON.stringify(dataObj);
			clientRes.write(content + "\n\n");
		}
	}

	switch(updateType){
		case 'playerJoin':
			// console.log("playerJoin: ", roomInfo.id);
			dataObj = {'eventType': updateType, 'playerScores': roomInfo.playerScores};
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
      roomInfo.firstAnswer = true;
      roomInfo.roundStartTime = Date.now();
    case 'nextRoomQuestion':
      var sendToClients =  function(){
        var dataObj = {
          eventType: updateType, 
          roundStartTime: roomInfo.roundStartTime
        };
        return sendToClientsCallback(dataObj);
      }
			selectNextQuestion(roomInfo, sendToClients);
      return;

		case 'startQuestionRound':
			roomInfo.currentRound++;
			// console.log("Room round: ", roomInfo.currentRound);
			if(roomInfo.currentRound <= roomInfo.maxRounds){
				roomInfo.gameState = "question";
				prepareQuestions(roomInfo, sendToClientsCallback);
				return;
			}
      else{
        myEmitter.emit('event', 'endGame', roomInfo);
      }
      break;

		case 'sendAnswers':
			dataObj = {
				eventType: updateType, 
				playerScores: roomInfo.playerScores, 
				submittedAnswers: roomInfo.hasSubmitted,
				trueAnswer: roomInfo.currentQuestion.character
			}
			sendToClientsCallback(dataObj);

			roomInfo.hasSubmitted = {};
      roomInfo.roundStartTime = undefined;

			if(roomInfo.questionIds.length > 0){
        roomInfo.firstAnswer = false;
				myEmitter.emit('event', 'nextRoomQuestion', roomInfo);
			}
			else{
				if(roomInfo.currentRound < roomInfo.maxRounds){
					myEmitter.emit('event', 'startQuestionRound', roomInfo);
				}
				else{
					myEmitter.emit('event', 'endGame', roomInfo);
				}
			}
			return;

    case 'playerReady':
      dataObj = {
        'eventType': updateType,
        'players': Object.keys(roomInfo.hasSubmitted)
      }
      break;

		case 'endGame':
			dataObj = {'eventType': updateType, playerScores: roomInfo.playerScores};
			break;
		default:
			dataObj = {'eventType': 'unknown event'};
      console.log("handle event encountered unknown event: ", updateType);
	}

	sendToClientsCallback(dataObj);

	if(updateType === 'disconnect' || updateType === 'endGame'){
		closeRoom(roomInfo);
	}
}

function closeRoom(roomInfo){
	var query = 'update rooms set closed=true WHERE id=$1';
  roomInfo.gameState = 'closed';
	db.none(query, roomInfo.id)
	.then(() => {
		// console.log("Closed room with id: ", roomInfo.id);
	})
	.catch(error => {
		console.log("Close room error: ", error );
	})

}

function prepareQuestions(roomInfo, callback){
	var questions = [];
	var users = Object.keys(roomInfo.playerScores);
	for(user of users){
		
		var characterId = getRandomCharacterId();
		questions.push({"roomid": roomInfo.id, "username": user,"character_id": characterId, "round": roomInfo.currentRound});
	}
	// console.log("Questions generated: ", questions);
	//var values = new Inserts('${roomId}, ${username}, ${character_id}, ${round}', questions);
	var query = pgp.helpers.insert(questions, ['roomid', 'username', 'character_id', 'round'], 'questions') + " RETURNING id";
	db.result(query)
		.then(result => {
      roomInfo.roundStartTime = Date.now();
			var dataObj = {
        'eventType': 'startQuestionRound', 
        currentRound: roomInfo.currentRound,
        roundStartTime: roomInfo.roundStartTime
      };
			for( row of result.rows){
				roomInfo.questionIds.push(row.id);
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
	var characterId = getRandomCharacterId();

	db.result(query, [roomId, username, characterId, round])
		.then(result => {
				if(result.count === 0){
					return res.status(200).json({'error': true, 'message': 'Error occurred when trying to create question'});
				}
		})
		.catch(function(error){
				console.log(error);
				res.status(500).end();
		})
}

function selectNextQuestion(roomInfo, sendToClients){
	if(roomInfo.questionIds.length > 0){
		var nextQuestionId = roomInfo.questionIds.shift();

		var query = 'SELECT questions.id, questions.username, questions.description, characters.* '
			+ 'FROM questions, characters where questions.id=$1 AND questions.character_id=characters.character_id';
		db.one(query, nextQuestionId)
		.then(result => {
      // console.log("select next question result:", result);
			roomInfo.currentQuestion = {
				question: 
				{
					id: result.id,
					owner: result.username,
					description: result.description
				},
				character:
				{
					characterId: result.character_id,
					name: result.name,
          element: result.element,
					race: result.race,
					weapon: result.weapon,
          style: result.style,
					story_exclusive: result.story_exclusive,
					restricted_words: result.restricted_words
				}
			};
			// console.log("Next question: ", roomInfo.currentQuestion);
   //    console.log("SendToClients function: ", sendToClients);
      sendToClients();
		})
		.catch(error => {
				//skip over this question if there was an error
			console.log(error);
		})
	}
}

router.all('*', cors({
  credentials: true, 
  origin: ['http://soumatou.moe', 'www.soumatou.moe'],,
  preflightContinue: true  
}));

router.get('/', function(req, res, next) {
	db.any('SELECT * FROM rooms WHERE closed=false AND started=false')
    .then(function(data) {
        res.json(data);
    })
    .catch(function(error) {
        // error;
        console.log(error);
    });
    
});

router.post('/create', function(req, res, next){
	// console.log(req.body);
	var body = req.body;
	var newRoomId = makeid();
	var query = 'INSERT INTO ROOMS(id, curr_capacity, max_capacity, closed, started, owner, max_rounds)' 
				+ 'VALUES($1, 1, $2, FALSE, FALSE, $3, $4)';	
	db.any(query, [newRoomId, body.capacity, body.owner, body.maxRounds])
	.then(function(data){
		// console.log("INSERT SUCCESS: " ,data);
		// console.log("Creating room with id: ", newRoomId);
		
		var newRoom = new Room(newRoomId, body.owner);
		rooms[newRoom.id] = newRoom;
		newRoom.playerScores[body.owner] = 0;
		newRoom.currentCapacity = 1;
    newRoom.maxRounds = body.maxRounds;
    newRoom.maxCapacity = body.capacity;
		// var roomIds = Object.keys(rooms);
		// console.log(roomIds);
		res.status(200).json({'success': true, 'room_id': newRoomId});
	})
	.catch(function(error){
		// console.log("INSERT FAIL:", error);
		res.status(500).end();
	})
});

router.put('/join', function(req, res, next){
	if(req.body == undefined || req.body.length == 0){
		// console.log("Bad request 1");
		return res.status(400).send('Bad Request');
	}

	if(req.query.room_id == undefined || req.query.username == undefined){
		return res.status(400).send('Bad Request');
	}

	var room_id = req.query.room_id;
	var roomInfo = rooms[room_id];

	if(roomInfo === undefined){
		res.status(200).send({'error': true, 'roomNotExist': true});
		return;
	}
	else if(roomInfo.gameState != 'lobby'){
		return res.status(200).send({'error': true, 'gameStarted': true});
	}
  else if(roomInfo.playerScores[req.query.username] != undefined) {
    return res.status(200).send({error: true, duplicateUsername: true});
  }

	db.result('UPDATE rooms SET curr_capacity=curr_capacity+1 WHERE id=$1', [room_id], r => r.rowCount)
    .then(count => {
       // count = number of rows affected (updated or deleted) by the query
       	if(count == 0){
       		res.status(200).send({'error': true, 'exists': false});
					return;
       	}

       	roomInfo.playerScores[req.query.username] = 0;
       	roomInfo.currentCapacity += 1;
       	myEmitter.emit('event', 'playerJoin', roomInfo);
       	return res.status(200).send('OK');

    })
    .catch(error => {
    	if(error.code == capacity_error_code){
        console.log("User join room: ", error);
    		return res.status(200).send({"error": true, "roomFull": true});
    	}
    	return res.status(500).send();
    });
});

router.get('/room', function(req, res, next){
	if(req.query.room_id == undefined || req.query.username == undefined){
		res.status(400).end();
	}
	else{
		var room = rooms[req.query.room_id];
    if(!room){
      return res.status(200).json({
        error: true,
        roomMissing: true
      });
    }
    else if(room.gameState === 'closed'){
      return res.status(200).json({
        error: true,
        roomClosed: true
      });
    }

    if(room.playerScores[req.query.username] === undefined){
      return res.status(200).json({
        error: true,
        noPermission: true
      });
    }

		var resObj = {
			id: room.id,
			owner: room.owner,
			playerScores: room.playerScores,
			gameState: room.gameState,
			currentRound: room.currentRound,
      maxCapacity: room.maxCapacity
		}

    if(room.gameState === "question"){
      resObj["roundStartTime"] = room.roundStartTime;
    }
    else if(room.gameState === "answer"){
      if(room.firstAnswer){
        resObj["roundStartTime"] = room.roundStartTime;
      }
    }
		res.status(200).json(resObj);
	}
})

router.post('/startGame', function(req, res, next){
	if(req.query.room_id == undefined || req.query.username == undefined){
		res.status(400).end();
	}
	else{
		var roomId = req.query.room_id;
    if(!rooms[roomId]){
      return res.status(200).json({
        error: true,
        roomNotExist: true
      });
    }
    db.none('UPDATE rooms set started=true where id=$1', roomId)
    .then(() => {
      myEmitter.emit('event', 'startQuestionRound', rooms[roomId]);
    res.status(200).send('OK');
    })
    .catch(error => {
      console.log("Failed to update room started column: ", error);
    })		
	}
})

router.get('/getGameState', function(req, res, next){
	if(req.query.room_id === undefined){
		res.status(400).end();
	}

	var roomInfo = rooms[req.query.room_id];
	if(roomInfo === undefined){
		var msg = 'Room with ID: ' + req.query.room_id + ' does not exist.';
		return res.status(200).json({error: true, message: msg});
	}

	if(roomInfo.gameState === 'lobby' || roomInfo.gameState === 'question'
			|| roomInfo.gameState === 'answer')
	{
		return res.status(200).json({gameState: roomInfo.gameState});
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
	// console.log("In eventstream endpoint");
	// console.log("register eventstream for room: ", req.query.room_id);
	// console.log(req.query);
	if(roomInfo != undefined){
		res.writeHead(200, {
	      'Connection': 'keep-alive',
	      'Content-Type': 'text/event-stream',
	      'Cache-Control': 'no-cache'
	    });

	    roomInfo.clients[username] = res;
	    //console.log("Registered user in eventstream: ", username);
	    var c = Object.keys(roomInfo.clients);
	    //console.log("clients: ", c);
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
					// if(count === 0){
					// 	console.log("No questions found for questions with roomid: ", room_id);
					// }
					// else{
					// 	console.log("Number of questions deleted: ", count);
					// }
				})
				.catch(function(error){
					console.log("Failed to delete questions");
					console.log(error);
				})

		}
		else{
			db.result('UPDATE rooms SET curr_capacity=curr_capacity-1 WHERE id=$1', [room_id], r => r.rowCount)
		    .then(count => {
		       // count = number of rows affected (updated or deleted) by the query
	       	if(count == 0){
	       		var message = "Room with ID: " + room_id + " not found.";
	       		return res.status(200).send({"error": true, "message": message});
	       	}

	       	delete roomInfo.playerScores[username];
	       	delete roomInfo.clients[username];
	       	roomInfo.currentCapacity -= 1;

	       	var clientNames = Object.keys(roomInfo.clients);
	       	myEmitter.emit('event', 'playerJoin', roomInfo);
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
  else {
    return res.status(200).json({
      error: true,
      roomNotFound: true
    })
  }
})

router.get('/roomQuestion', function(req, res, next){
	if(req.query.room_id === undefined || req.query.username === undefined){
		res.status(400).end();
	}

	var roomInfo = rooms[req.query.room_id];
	if(roomInfo === undefined){
		var errMsg = 'Could not find question with ID: ' + questionId
		return res.status(200).json({
      'error': true, 
      'message': errMsg
    });
	}
	
  var username = req.query.username;
	var currentQuestion = roomInfo.currentQuestion;

  //console.log("Current question: ", currentQuestion);
  if(currentQuestion.question.owner === username){
    res.status(200).json(currentQuestion);
    return;
  }

  var hasAnswered = (roomInfo.hasSubmitted[username] != undefined);

  var resObj = {
    question: currentQuestion.question,
    hasAnswered: hasAnswered
  };

  if(hasAnswered){
    resObj["submittedAnswer"] = roomInfo.submittedAnswers[username].answer;
  }
  resObj["playersReady"] = Object.keys(roomInfo.hasSubmitted);

	res.status(200).json(resObj);
})



router.get('/getMyQuestion', function(req, res, next){
  //console.log("getMyQuestion query params: ", req.query);
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
		return res.status(200).send({'error': true, 'roomExists': false})
	}
	else if(round != roomInfo.currentRound){
		return res.status(200).send({'error': true, 'expired': true, 'currentRound': roomInfo.currentRound })
	}


  var selectQuery = 'SELECT questions.id, questions.description, characters.* from questions, characters ' 
    + 'where questions.roomId=${room_id} AND username=${username} AND round=${round} AND questions.character_id=characters.character_id';

	db.one(selectQuery, req.query)
		.then(result => {
			res.status(200).json({
				question: 
				{
					id: result.id,
					username: result.username,
          description: result.description
				},
				character:
				{
					characterId: result.character_id,
					name: result.name,
          element: result.element,
					race: result.race,
					weapon: result.weapon,
          style: result.style,
					storyExclusive: result.story_exclusive,
					restrictedWords: result.restricted_words
				},
        hasSubmittedDescription: !(roomInfo.hasSubmitted[username] === undefined),
        playersReady: Object.keys(roomInfo.hasSubmitted)
			})
		})
		.catch(error => {
			console.log(error);
		})
})

router.post('/submitDescription', function(req, res, next){
	if(req.body.questionId === undefined || req.body.room_id === undefined
			|| req.body.description === undefined || req.body.username === undefined){
		res.status(400).end()
		return;
	}

	var questionId = req.body.questionId;
	var username = req.body.username;
	var roomInfo = rooms[req.body.room_id];

	if(roomInfo === undefined){
		return res.status(200).send({'error': true, 'questionExists': false});
	}

	if(roomInfo.hasSubmitted[username] != undefined){
		 return res.status(200).send({'error': true, 'repost': true});
	}

	db.result('UPDATE questions SET description=${description} WHERE id=${questionId}', req.body, r => r.rowCount)
	.then(count => {
		if(count === 0 ){
			res.status(200).json({'error': true, 'questionExists': false});
		}
		else{
			res.status(200).json('OK');
			roomInfo.hasSubmitted[username] = true;
			// console.log("Submitted users: ", roomInfo.hasSubmitted);
			// console.log("Submitted users length: ", Object.keys(roomInfo.hasSubmitted).length);
			// console.log("Room capacity: ", roomInfo.currentCapacity);

			if(Object.keys(roomInfo.hasSubmitted).length === roomInfo.currentCapacity){
				// console.log("Everyone has submitted.");
				roomInfo.hasSubmitted= {};
				myEmitter.emit('event', 'startAnswerRound', roomInfo);
			}
      else{
        myEmitter.emit('event', 'playerReady', roomInfo);
      }
		}
	})
	.catch(function(error){
			// console.log(error);
			res.status(500).end();
	})
})

router.post('/submitAnswer', function(req, res, next){
	if(req.body.questionId === undefined || req.body.room_id === undefined
			|| req.body.username === undefined || req.body.answer === undefined){
		res.status(400).end();
		return;
	}
	// console.log("submit Answer req body: ", req.body);
	var roomInfo = rooms[req.body.room_id];
	var questionId = req.body.question_id;
	var answer = req.body.answer;
	var username = req.body.username;

	if(roomInfo === undefined){
		var msg = "Room with id " + req.body.room_id + " doesnt exist";
		// console.log(msg);
		return res.status(200).json({'error': true, 'exists': false});
	}

	if(roomInfo.gameState != 'answer'){
		return res.status(200).json({'error': true, 'expired': true});
	}

	if(roomInfo.hasSubmitted[username] != undefined){
		return res.status(200).json({'error': true, 'repost': true});
	}
	// else if(questionId != roomInfo.currentQuestion.id){
	// 	var msg = 'Question with ID: ' + questionId + ' has already expired.';
	// 	res.status(200).json({'sucess': false, "message": msg});
	// }
	var currentQuestion = roomInfo.currentQuestion;
	roomInfo.hasSubmitted[username] = {
		answer: answer,
		correct: false
	};

	if(currentQuestion.character.name.toLowerCase() === answer.toLowerCase().trim()){
		roomInfo.playerScores[username]+=1000;
		roomInfo.hasSubmitted[username].correct = true;
		roomInfo.playerScores[currentQuestion.question.owner]+=1500;
	}

	res.status(200).send('OK');
	if(Object.keys(roomInfo.hasSubmitted).length === (roomInfo.currentCapacity -1)){
		myEmitter.emit('event', 'sendAnswers', roomInfo);
	}
  else{
    myEmitter.emit('event', playerReady, roomInfo);
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

module.exports = router;


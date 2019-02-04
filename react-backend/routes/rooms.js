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
var timePerDescribe = 75 * 1000;
var timePerGuess = 30 * 1000;
var timePerRound = 2.5 * minutesInMs;
// var timePerRound = 15 * 1000;
var clearOldRooms = setInterval(deleteOldRooms, 5 * minutesInMs);
/***********************************************************************/

/**
 * Generates a random character id that is not in a given map of character ids
 * @param {object} A plain object functioning as a set/map of character id
 * @return {int} A new character id.
**/
function getRandomCharacterId(charactersShown){
  var randId = Math.floor(Math.random() * Math.floor(numCharacters)) + 1;
  while(charactersShown[randId]){
    randId = Math.floor(Math.random() * Math.floor(numCharacters)) + 1
  }
  return randId;
}

/**
 * Generates a random 8 character id sting
 * @return {string} A randomly generated 8 character string
**/
function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 8; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

/**
 * Deletes rooms that are older than an hour or rooms that have been closed from the database
**/
function deleteOldRooms(){
  db.any("DELETE FROM rooms where created + interval '1h' < now() OR closed=true RETURNING *")
  .then(result => {
    for(var i = 0; i<result.length; i++){
      var room = result[i];
      rooms[room.id] = undefined
    }
  })
  .catch(error => {
    console.log("Failed to delete old rooms: ", error);
  })
}

/**
 * Represents a room
 * @constructor
 * @param {string} id - The id of the room
 * @param {string} owner - The username of the room's owner
**/
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
  this.charactersShown = {};
	this.currentQuestion = {};
}

/**
 * Represents a character
 * @param characterId {int} - The character's id
 * @param name {string} - The character's name
 * @param element {string} - The character's element
 * @param race {string} - The character's race
 * @param weapon {string} - The character's weapon proficiency
 * @param style {string} - The character's style
 * @param story_exclusive {boolean} - Whether the character is story only
 * @param restricted_words - Comma separated string of words that cannot be used to describe this character
**/
function Character(characterId, name, element, race, weapon, style, story_exclusive, restricted_words){
  this.characterId = characterId;
  this.name = name;
  this.element = element;
  this.race = race;
  this.weapon = weapon;
  this.style = style;
  this.story_exclusive;
  this.restricted_words = restricted_words;
}
/**
 * Event handler function that implements a finite state machine for handling game state transitions.
 * Pushes state changes in a room to every player in the room
 * @param updateType {string} - The type of event/state change to be handled
 * @param roomInfo {room} - The room object of the room that is receiving the state change
**/
function handleEvent(updateType, roomInfo){
	var clients = roomInfo.clients;
	var clientNames = Object.keys(clients);
	var dataObj;

	var sendToClientsCallback = function(dataObj){
		for(let name of clientNames){
			var clientRes = clients[name];
			var content = 'data: ' + JSON.stringify(dataObj);
			clientRes.write(content + "\n\n");
		}
	}

	switch(updateType){
		case 'playerJoin':
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
    case 'nextRoomQuestion':
      roomInfo.roundStartTime = Date.now();
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
			if(roomInfo.currentRound <= roomInfo.maxRounds){
				roomInfo.gameState = "question";
				prepareQuestions(roomInfo, sendToClientsCallback);
        roomInfo.timerFunc = setTimeout(function(){
          roomInfo.hasSubmitted = {};
          myEmitter.emit('event', 'startAnswerRound', roomInfo);
        }, timePerDescribe);
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

/**
 * Sets a room's state to closed on both the server and the database
 * @param roomInfo {room} - The room object of the room that is to be closed
**/
function closeRoom(roomInfo){
	var query = 'update rooms set closed=true WHERE id=$1';
  roomInfo.gameState = 'closed';
  if(roomInfo.timerFunc){
    clearTimeout(roomInfo.timerFunc);
  }

	db.none(query, roomInfo.id)
	.then(() => {
		// console.log("Closed room with id: ", roomInfo.id);
	})
	.catch(error => {
		console.log("Close room error: ", error );
	})

}

/**
 * Generates a random question that has not been encountered before for each player in a room.
 * Only generates one question per player for the current round.
 * @param roomInfo {room} - The room object of the room
 * @param callback {function} - A callback function to be executed when the questions have been generated
**/
function prepareQuestions(roomInfo, callback){
	var questions = [];
	var users = Object.keys(roomInfo.playerScores);
	for(user of users){
		var characterId = getRandomCharacterId(roomInfo.charactersShown);
    roomInfo.charactersShown[characterId] = true;
		questions.push({"roomid": roomInfo.id, "username": user,"character_id": characterId, "round": roomInfo.currentRound});
	}

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

/**
 * Retrieves the next question to be answered by players in the room and sends it using a callback.
 * @param roomInfo {room} - The room object of the room
 * @param sendToClients {function} - The function that sends the new question data to the players
**/
function selectNextQuestion(roomInfo, sendToClients){
	if(roomInfo.questionIds.length > 0){
		var nextQuestionId = roomInfo.questionIds.shift();

		var query = 'SELECT questions.id, questions.username, questions.description, characters.* '
			+ 'FROM questions, characters where questions.id=$1 AND questions.character_id=characters.character_id';
		db.one(query, nextQuestionId)
		.then(result => {
      // console.log("select next question result:", result);
      var description;
      if(!result.description){
        description ='';
      }
      else{
        description = result.description;
      }

			roomInfo.currentQuestion = {
				question: 
				{
					id: result.id,
					owner: result.username,
					description: description
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
      sendToClients();

      roomInfo.timerFunc = setTimeout(function(){
        myEmitter.emit('event', 'sendAnswers', roomInfo)
      }, timePerGuess);
		})
		.catch(error => {
				//skip over this question if there was an error
			console.log(error);
		})
	}
}

router.all('*', cors({
  credentials: true, 
  origin: '*',
  preflightContinue: true  
}));

/**
 * GET endpoint - Returns all rooms that have not started and are not closed
 *
 * Response:
 * An array of room objects
**/
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

/**
 * POST endpoint - Creates and initializes a new room
 *
 * Query parameters:
 * owner {string} - The username of the creator of the new room
 * capacity {int} - The maximum capacity that the new room should have
 * maxRounds {int} - The maximum number of rounds that the new room should have
 *
 * Response:
 * room_id {string} - The room id of the newly created room
 * success {boolean} - Whether the room was created successfully
**/
router.post('/create', function(req, res, next){
	var body = req.body;
  if(!body || !body.owner || !body.capacity || body.capacity < 1 || !body.maxRounds || body.maxRounds < 1){
    return res.status(400).end();
  }
	var newRoomId = makeid();
	var query = 'INSERT INTO ROOMS(id, curr_capacity, max_capacity, closed, started, owner, max_rounds)' 
				+ 'VALUES($1, 1, $2, FALSE, FALSE, $3, $4)';	
	db.any(query, [newRoomId, body.capacity, body.owner, body.maxRounds])
	.then(function(data){
		var newRoom = new Room(newRoomId, body.owner);
		rooms[newRoom.id] = newRoom;
		newRoom.playerScores[body.owner] = 0;
		newRoom.currentCapacity = 1;
    newRoom.maxRounds = body.maxRounds;
    newRoom.maxCapacity = body.capacity;
		res.status(200).json({'success': true, 'room_id': newRoomId});
	})
	.catch(function(error){
		res.status(500).end();
	})
});

/**
 * PUT endpoint - Joins an existing room
 * Returns an error if 
 * 1. The room does not exist
 * 2. The game has already started in the target room
 * 3. The room is already full
 * 4. A player with the same username is already in the room
 *
 * Query parameters:
 * username {string} - The username of the player
 * room_id {string} - The room id of the target room
 *
 * Response:
 * error {boolean} - Whether the player joined the room successfully
 * roomNotExist {boolean} - Whether a room with the given room id exists
 * roomFull {boolean} - Whether the room is already full
 * gameStarted {boolean} - Whether the game in the room has started
 * duplicateUsername {boolean} - Whether the room has a player with the same username
**/
router.put('/join', function(req, res, next){

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
    		return res.status(200).send({"error": true, "roomFull": true});
    	}
    	return res.status(500).send();
    });
});

/**
 * GET endpoint - Returns a room
 * Returns an error if 
 * 1. The room does not exist
 * 2. The room is closed
 * 3. The player is not part of the room
 *
 * Query parameters:
 * username {string} - The username of the player
 * room_id {string} - The room id of the target room
 *
 * Response:
 * error {boolean} - Whether there was an error
 * roomNotExist {boolean} - Whether a room with the given room id exists
 * roomClosed {boolean} - Whether the room is already closed
 * noPermission {boolean} - Whether the player is part of the room
**/
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

/**
 * POST endpoint - Starts the game of a room
 * Returns an error if 
 * 1. The room does not exist
 *
 * Query parameters:
 * room_id {string} - The room id of the target room
 *
 * Response:
 * error {boolean} - Whether there was an error
 * roomNotExist {boolean} - Whether a room with the given room id exists
**/
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

/**
 * GET endpoint - Returns the current game state of a room
 * Returns an error if 
 * 1. The room does not exist
 *
 * Query parameters:
 * room_id {string} - The room id of the target room
 *
 * Response:
 * gameState {string} - The current game state of the room
 * error {boolean} - Whether there was an error
 * message {string} - Error message indicating that the room does not exist
**/
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

/**
 * GET endpoint - Subscribes to the room's event stream (Server sent events)
 *
 * Query parameters:
 * room_id {string} - The room id of the target room
 *
**/
router.get('/eventstream', function(req, res, next){

	if(req.query.room_id === undefined || req.query.username === undefined){
		res.status(400).end()
		return;
	}

	var roomInfo = rooms[req.query.room_id];
	var username = req.query.username;
	if(roomInfo != undefined){
		res.writeHead(200, {
      'Connection': 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
	   });

	   roomInfo.clients[username] = res;
	}
})

/**
 * GET endpoint - Leaves a room
 * Returns an error if 
 * 1. The room does not exist
 *
 * Query parameters:
 * room_id {string} - The room id of the target room
 * username {string} - The username of the leaving player
 *
 * Response:
 * error {boolean} - Whether there was an error
 * message {string} - Error message indicating that the room does not exist
**/
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
          else{
            myEmitter.emit('event', 'disconnect', roomInfo);
            res.status(200).send('OK');
          }
				})
				.catch(error => {
					console.log(error);
					res.status(500).end();
				})

			db.result('DELETE FROM questions WHERE roomid=$1', [room_id], r => r.rowCount)
				.then(count =>{
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
          
          if(Object.keys(roomInfo.playerScores).length === roomInfo.currentCapacity){
            if(roomInfo.gameState === 'question'){
              myEmitter.emit('event', 'startAnswerRound', roomInfo);
            }
            else if(roomInfo.gameState === 'answer'){
              myEmitter.emit('event', 'sendAnswers', roomInfo);
            }
          }
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

/**
 * GET endpoint - Returns the current question of the round that players need to answer
 * Returns an error if 
 * 1. The room does not exist
 * 
 * Query parameters:
 * room_id {string} - The room id of the target room
 *
 * Response:
 * A JSON object with a question object and character object
 * Question {
 *  id {string} - The question's id
 *  owner {string} - The username of the player that owns this question
 *  description {string} - The descriptions entered by the question owner 
 * }
**/
router.get('/roomQuestion', function(req, res, next){
	if(req.query.room_id === undefined || req.query.username === undefined){
		res.status(400).end();
	}

	var roomInfo = rooms[req.query.room_id];
	if(roomInfo === undefined){
		var errMsg = 'Could not find room with ID: ' + req.query.room_id;
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


/**
 * GET endpoint - Returns the current question that the player needs to describe
 * Returns an error if 
 * 1. The room does not exist
 * 2. The player is not up to date with the room (Disconnections for example)
 * 
 * Query parameters:
 * room_id {string} - The room id of the target room
 * username {string} - The player's username
 * round {int} - The player's current round from the player's client
 *
 * Response:
 * question {Question} - The question object of the current question that the player needs to describe
 * character {Character} - The character object of the character in the question
 * error {boolean} - Whether there was an error
 * roomExists {boolean} - Whether the room exists
 * expired {boolean} - Whether the player is out of date/desynced
 * currentRound {int} - The current round of the room
 * hasSubmittedDescription {boolea} - Whether the player has described this question
 * playersReady {string arrya} - An array of players who have already described their questions this round 
**/
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

/**
 * POST endpoint - Submits a description to the player's current question
 * Returns an error if 
 * 1. The room does not exist
 * 2. The player has already described their question
 * 3. The question does not exist
 * 
 * Query parameters:
 * room_id {string} - The room id of the target room
 * username {string} - The player's username
 * questionId {int} - The id of the question
 * description {string} - The description 
 *
 * Response:
 * error {boolean} - Whether there was an error
 * roomNotExists {boolean} - Whether the room exists
 * questionExists {boolean} - Whether the question exists
 * repost {boolean} - Whether the player has already described this question
**/
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
		return res.status(200).send({'error': true, 'roomNotExist': true});
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

			if(Object.keys(roomInfo.hasSubmitted).length === roomInfo.currentCapacity){
				roomInfo.hasSubmitted= {};
        if(roomInfo.timerFunc){
          clearTimeout(roomInfo.timerFunc);
        }
				myEmitter.emit('event', 'startAnswerRound', roomInfo);
			}
      else{
        myEmitter.emit('event', 'playerReady', roomInfo);
      }
		}
	})
	.catch(function(error){
			console.log(error);
			res.status(500).end();
	})
})

/**
 * POST endpoint - Submits a answer to the room's current question
 * Returns an error if 
 * 1. The room does not exist
 * 2. The player has already submitted their answer
 * 3. The question does not exist
 * 4. The room's state is no longer in the answer phase
 * 
 * Query parameters:
 * room_id {string} - The room id of the target room
 * username {string} - The player's username
 * questionId {int} - The id of the question
 * answer {string} - The player's answer 
 *
 * Response:
 * error {boolean} - Whether there was an error
 * exists {boolean} - Whether the room exists
 * expired {boolean} - Whether the answer was submitted after the room is no longer in the answer phase
 * repost {boolean} - Whether the player has already answered this question
**/
router.post('/submitAnswer', function(req, res, next){
	if(req.body.questionId === undefined || req.body.room_id === undefined
			|| req.body.username === undefined || req.body.answer === undefined){
		res.status(400).end();
		return;
	}
	var roomInfo = rooms[req.body.room_id];
	var questionId = req.body.question_id;
	var answer = req.body.answer;
	var username = req.body.username;

	if(roomInfo === undefined){
		var msg = "Room with id " + req.body.room_id + " doesnt exist";
		return res.status(200).json({'error': true, 'exists': false});
	}

	if(roomInfo.gameState != 'answer'){
		return res.status(200).json({'error': true, 'expired': true});
	}

	if(roomInfo.hasSubmitted[username] != undefined){
		return res.status(200).json({'error': true, 'repost': true});
	}

	var currentQuestion = roomInfo.currentQuestion;
	roomInfo.hasSubmitted[username] = {
		answer: answer,
		correct: false
	};

	if(currentQuestion.character.name.toLowerCase() === answer.toLowerCase().trim()){
		roomInfo.playerScores[username]+=1;
		roomInfo.hasSubmitted[username].correct = true;
		roomInfo.playerScores[currentQuestion.question.owner]+=1;
	}

	res.status(200).json('OK');
	if(Object.keys(roomInfo.hasSubmitted).length === (roomInfo.currentCapacity -1)){
    if(roomInfo.timerFunc){
      clearTimeout(roomInfo.timerFunc);
    }
		myEmitter.emit('event', 'sendAnswers', roomInfo);
	}
  else{
    console.log("Send playerReady from submitAnswer");
    myEmitter.emit('event', 'playerReady', roomInfo);
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


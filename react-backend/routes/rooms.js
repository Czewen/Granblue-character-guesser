var express = require('express');
var router = express.Router();
var pgp = require('pg-promise')(/*options*/)
// var db = pgp('postgres://Cze Wen:admin@localhost:5432/granblue')
var db = pgp('postgres://Cze Wen:admin@localhost:5432/granblue')
var rooms = require('./globalArr');

const capacity_error_code = 23514;

function Room(id, owner){
	this.id = id;
	this.owner = owner;
	this.playerScores = {owner: 0};
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
	db.any('INSERT INTO ROOMS VALUES($1, 1, $2, FALSE, $3)', [body.id, body.capacity, body.difficulty])
	.then(function(data){
		console.log("INSERT SUCCESS:" ,data);
		var newRoom = new Room(body.id, body.owner);
		rooms[newRoom.id] = newRoom;

		res.status(201).json({'success': true});
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
       	//for testing purposes
       	if(rooms[room_id] == undefined){
       		rooms[room_id] = new Room(room_id, "Dummy");
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

module.exports = router;


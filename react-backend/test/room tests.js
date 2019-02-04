process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../app');
let should = chai.should();

let requester;
let createdRoom;

chai.use(chaiHttp);

const testHelper = require('./testHelper');

describe('Rooms', () => {
  before(function(){
    requester = chai.request(server).keepOpen();
  })

  after(function(){
    testHelper.clearTable('rooms');
    testHelper.shutdown();
    requester.close();
  })

  describe('/POST room', () => {
    const createAPI = "/api/rooms/create";
    it('should create a room', (done) => {
      createdRoom = {
        owner: "tester",
        capacity: 2,
        maxRounds: 8
      }

      requester
        .post(createAPI)
        .send(createdRoom)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have.property('success').eql(true);
          res.body.should.have.property('room_id');
          createdRoom["roomId"] = res.body.room_id;
          done();
        });
    })

    it('should not create a room without an owner', done => {
      requester
      .post(createAPI)
      .send({capacity: 4, maxRounds: 8})
      .end((err, res) => {
        if(err){
          console.log(err);
        }
        res.should.have.status(400);
        done();
      })
    })

    it('should not create a room without capacity', done => {
      requester
      .post(createAPI)
      .send({owner: "tester", maxRounds: 8})
      .end((err, res) => {
        res.should.have.status(400);
        done();
      })
    })

    it('should not create a room without max rounds', done => {
      requester
      .post(createAPI)
      .send({owner: "tester", capacity: 4})
      .end((err, res) => {
        res.should.have.status(400);
        done();
      })
    })
  })

  describe('/GET rooms', () => {
    const getRoomAPI = "/api/rooms/room";
    it('it should get an active room by the given id', (done) => {
      requester.get(getRoomAPI)
      .query({room_id: createdRoom.roomId, username: createdRoom.owner})
      .end((err, res) => {
        if(err){
          asser.fail(err);
        }

        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('id').eql(createdRoom.roomId);
        res.body.should.have.property('owner').eql(createdRoom.owner);
        res.body.should.have.property('gameState').eql('lobby');
        res.body.should.have.property('currentRound').eql(0);
        res.body.should.have.property('maxCapacity').eql(createdRoom.capacity);
        done();
      })
    })

    it('should return a 400 error when an id is not given', (done) => {
      requester.get(getRoomAPI)
      .end((err, res) => {
        res.should.have.status(400);
        done();
      })
    })

    it('should return an error if the given id is invalid', (done) => {
      requester.get(getRoomAPI)
      .query({room_id: "UNKNOWN0", username: "tester"})
      .end((err, res) => {
        res.body.should.be.a('object');
        res.body.should.have.property('error').eql(true);
        res.body.should.have.property('roomMissing').eql(true);
        done();
      })
    })

  })

  describe('/PUT Join',() => {
    const joinRoomAPI = '/api/rooms/join';
    it('should be able to join an open room', done => {
      requester
      .put(joinRoomAPI)
      .query({room_id: createdRoom.roomId, username: "JoinTest"})
      .end((err, res) => {
        res.should.have.status(200);
        done();
      })
    })

    it('should not be able to join a room that does not exist', done => {
      requester
      .put(joinRoomAPI)
      .query({room_id: "BADBEEF1", username: "JoinTest"})
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('error').eql(true);
        res.body.should.have.property('roomNotExist').eql(true);
        done();
      })
    })

    it('should not be able to join a room with the same username', done => {
      requester
      .put(joinRoomAPI)
      .query({room_id: createdRoom.roomId, username: "JoinTest"})
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('error').eql(true);
        res.body.should.have.property('duplicateUsername').eql(true);
        done();
      })
    })

    it('should not be able to join a room that is already full', done => {
      requester
      .put(joinRoomAPI)
      .query({room_id: createdRoom.roomId, username: "FullRoom"})
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('error').eql(true);
        res.body.should.have.property('roomFull').eql(true);
        done();
      })
    })
  })

  describe('/POST startGame', () => {
    const startGameAPI = '/api/rooms/startGame';
    it('should be able to start a game', done => {
      requester
      .post(startGameAPI)
      .query({room_id: createdRoom.roomId, username: createdRoom.owner})
      .end((err, res) => {
        res.should.have.status(200);
        done();
      })
    })

    it('should not be able to start a game without a room id', done => {
      requester
      .post(startGameAPI)
      .query({username: createdRoom.owner})
      .end((err, res) => {
        res.should.have.status(400);
        done();
      })
    })

    it("'should not be able to start a game in a room that doesn't exist", done => {
      requester
      .post(startGameAPI)
      .query({room_id: "BADBEEF1", username: "Tester"})
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('error').eql(true);
        res.body.should.have.property('roomNotExist').eql(true);
        done();
      })
    })
  })

  describe('/GET eventstream', () => {
    const eventstreamAPI = '/api/eventstream';
    it('should be able to subscribe to a rooms eventstream', () => {
      requester
      .get(eventstreamAPI)
      .query({room_id: createdRoom.roomId, username: createdRoom.owner})
      .end((err, res) => {
        res.should.have.status(200);
        if(err)
          console.log(err);
        console.log(res);
        done();
      })
    })


  })

})
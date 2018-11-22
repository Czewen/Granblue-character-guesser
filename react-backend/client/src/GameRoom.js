import React from 'react';
import axios from 'axios';
import ReactTable from 'react-table';
import "react-table/react-table.css";
import Modal from 'react-modal';
import update from 'immutability-helper'
import { Redirect } from 'react-router';
import TimerCountdown from './UIComponents/TimerCountdown';
import QuestionViewComponent from './GameInterface/QuestionViewComponent';
import AnswerViewComponent from './GameInterface/AnswerViewComponent';
import ScoreBoardComponent from './GameInterface/ScoreBoardComponent';
import AnswerResults from './GameInterface/AnswerResults';
import EndGameScreen from './GameInterface/EndGameScreen';
import GameRoomLobby from './GameInterface/GameRoomLobby';
import TimerModal from './TimerModal';
import ErrorModal from './ErrorModal';
import { withRouter } from "react-router";
import $ from 'jquery';
import "./css/my_styles.css";

var hideModalCounter = 0;

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

function ScoreBoard(props){
	if(props.gameStarted === true){
		var scores = props.playerScores
		var names = Object.keys(scores);

		var data = [];
		for(let n of names){
			data.push({'name' : n, 'score': scores[n]});
		};

		var columns = [{
			Header: 'Player',
			accessor: 'name',
		},
		{
			Header: 'Score',
			accessor: 'score'
		}];

		return (
			<table className="table rounded">
				<thead className="thead">
					<tr>
						<th scope="col">Player</th>
						<th scope="col">Score</th>
					</tr>
				</thead>
				<tbody>
					{
						data.map(function(item, i){
							return (
								<tr key={i}>
									<td>{item.name}</td>
									<td>{item.score}</td>
								</tr>
							);
						})
					}
				</tbody>
			</table>);
	}
	else{
		return null;
	}
}

class GameRoom extends React.Component {
	constructor(props){
		super(props);
    if(this.props.username === undefined && this.props.location.state === undefined){
      this.state = {
        disconnect: true
      };
      return;
    }
    else{
  		var username = this.props.location == undefined ? this.props.username : this.props.location.state.username;
  		if(username == undefined){
  			username = this.props.username;
  		}

  		var roomId = this.props.match == undefined ? this.props.roomId : this.props.match.params.id;
  		if(roomId == undefined){
  			roomId = this.props.roomId;
  		}

  		this.state = {
  			roomId: roomId,
  			username: username,
  			owner: "",
  			gameState: "lobby",
  			disconnect: false,
  			gameStarted: false,
  			playerScores: [],
        playersReady: {},
        maxCapacity: 2,
  			currentRound: 0,
        currRoomQuestionNum: 0,
  			answer: undefined,
  			submittedAnswers: [],
  			showAnswerResultsModal: false,
        errorMessage: '',

        timerLock: false
  		};

      this.timerMaxDuration =  10.0;

      // 2.5 minutes in MS
      this.roundTimeInMS = 2.5 * 60 * 1000;
      // this.roundTimeInMS = 15 * 1000;

  		this.startGame = this.startGame.bind(this);
  		this.handleEvent = this.handleEvent.bind(this);
  		this.updateScores = this.updateScores.bind(this);
  		this.leaveRoom = this.leaveRoom.bind(this);
  		this.testUpdateScore = this.testUpdateScore.bind(this);
  		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;

  		this.eventSource = new EventSource(API_base + '/api/rooms/eventstream' + params);
  		this.eventSource.onmessage = (e) => this.handleEvent(JSON.parse(e.data));

  		this.answerViewRef = React.createRef();
      this.timerModalRef = React.createRef();
      this.timerCountdownRef = React.createRef();
    }
	}

	startGame(){

    if(Object.keys(this.state.playerScores).length === 1){
      var errMsg = "You need more than 1 player" 
        + " in the room before you can start the game.";
      this.setState({
        errorMessage: errMsg
      }, 
      () => {
        $('#errorModal').modal('show');
      })
      return;
    }

		var params = "?room_id=" + this.state.roomId + "&username=" + this.state.username;
		axios.post(API_base + '/api/rooms/startGame' + params, {})
		.then(function(response){
			//console.log("Start game response: ", response );
		})
		.catch(function(error){

		})
	}

  dismissErrorModal = () => {
    this.setState({
      errorMessage: ''
    });
  }

	testUpdateScore(){
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
		//console.log("called test update score");
		axios.get(API_base + '/api/rooms/testUpdateScore' + params, {})
		.then(function(response){
			//console.log(response);
		})
		.catch(function(error){
			//console.log("testUpdateScore err: ", error);
		})
	}

	hideAnswerResultsModal = () => {
		//console.log("hide player modal");
		this.setState({
			showAnswerResultsModal: false
		})
	};

	handleEvent(eventData){
		//console.log("handleEvent");
    var self =  this;

		switch(eventData.eventType){
      case 'playerJoin':
        this.updateScores(eventData.playerScores);
        break;

			case 'disconnect':
				//console.log('host disconnected');
				this.setState({disconnect: true});
				break;

			case 'startQuestionRound':
				//console.log('question round: ', eventData);
        var timeDiff = (Date.now() - eventData.roundStartTime)/1000;
        //console.log("timediff: ", timeDiff);

        if(timeDiff < this.timerMaxDuration){
          var seconds = Math.ceil(this.timerMaxDuration - timeDiff);   
          this.setState({
            roundStartTime: eventData.roundStartTime,
            gameStarted: true,
            gameState: "question",
            currRoomQuestionNum: 0, 
            currentRound: eventData.currentRound,
            playersReady: {},
            roundTimeLeft: this.getTimeRemaining(eventData.roundStartTime)
          }, () => {
            if(!this.state.showAnswerResultsModal){
              $('#timerModal').modal('show');
              this.timerModalRef.current.startCountdown(seconds);
            }
            this.timerCountdownRef.current.startCountdown(this.state.roundTimeLeft);
          });

          var timeoutFunc = setTimeout(function(){
            ////console.log("Start new question round: hiding modal");
            $('#timerModal').modal('hide');
            self.setState({
              roundStartTime: undefined
            });
          }, seconds * 1000);
          //console.log("timeoutFunc: ", timeoutFunc);
        }
        else{
          this.setState({
            gameStarted: true,
            gameState: "question",
            currRoomQuestionNum: 0, 
            currentRound: eventData.currentRound,
            playersReady: {},
            roundStartTime: undefined,
            roundTimeLeft: this.getTimeRemaining(eventData.roundStartTime)
          }, 
          () => {
            this.timerCountdownRef.current.startCountdown(this.state.roundTimeLeft);
          });
        }
				break;

			case 'startAnswerRound':
        this.setState({
          gameState: "answer",
          currRoomQuestionNum: 1,
          playersReady: {},
          roundStartTime: eventData.roundStartTime, 
          roundTimeLeft: this.getTimeRemaining(eventData.roundStartTime)
        },
        () => {
          this.timerCountdownRef.current.startCountdown(this.state.roundTimeLeft);
        });
				break;

      case 'nextRoomQuestion':
        this.setState({
          currRoomQuestionNum: this.state.currRoomQuestionNum + 1,
          roundTimeLeft: this.getTimeRemaining(eventData.roundStartTime),
          playersReady: {}
        }, 
        () => {
          this.timerCountdownRef.current.startCountdown(this.state.roundTimeLeft);
        });
        break;

      case 'playerReady':
        var playersReady = {}
        for(var player of eventData.players){
          playersReady[player] = true;
        }
        this.setState({
          playersReady: playersReady
        })
        break;

			case 'sendAnswers':
				//console.log("sendAnswers eventData: ", eventData);
				this.setState({
					playerScores: eventData.playerScores,
					answer: eventData.trueAnswer,
					submittedAnswers: eventData.submittedAnswers,
					showAnswerResultsModal: true,
				}, 
        () => {
          $('#resultsModal').modal('show');
        });
				//this.answerViewRef.getRoomQuestions();
				break;
			case 'endGame':
				this.setState({
          gameState: 'gameEnded'
        });
				break;
			default:
				//console.log("Received unknown event: ", eventData.eventType);
		}
	}

  getTimeRemaining = (startTime) => {
    var endTime = startTime + this.roundTimeInMS;
    var now = Date.now();

    // timeDiff calculated in seconds
    var timeDiff = Math.floor((endTime - now)/1000);
    if(timeDiff <= 0){
      return 0;
    }

    return timeDiff;
  }

	updateScores(newScores){
		this.setState({
			playerScores: newScores
		});
	}

	leaveRoom(){

    if(this.state.gameState === 'gameEnded'){
      this.returnToLobby();
    }

		var self = this;
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
		//console.log("Leave room: ", this.state.roomId );
		axios.post(API_base +'/api/rooms/leave' + params, {})
		.then(function(response){
			//console.log("leave response: ", response);
			//console.log("room owner: ", self.state.owner);
			if(response.status == 200 && self.state.username != self.state.owner){
				self.returnToLobby();
			}
		})
		.catch(function(error){
			//console.log("Error occured while trying to leave room: ", error);
      self.returnToLobby();
		})
	}

	returnToLobby = () => {
		this.eventSource.close();
		this.setState({
      disconnect: true
    })
	}

  syncRoomState = () => {
    var self = this;
    var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
    axios.get(API_base + '/api/rooms/room' + params, {})
    .then(function(response){

      var data = response.data;
      var gameStarted = data.gameState === "lobby" ? false : true;
      if(response.status === 200 ){

        if(response.data.roomClosed){
          self.setState({
            disconnect: true,
            roomClosed: true
          });
          return;
        }
        else if(response.data.noPermission){
          self.setState({
            disconnect: true,
            noPermission: true
          })
          return;
        }

        if(data.roundStartTime && gameStarted === "question" ){
          var timeDiff = (Date.now() - data.roundStartTime)/1000;
          if(timeDiff < self.timerMaxDuration){
            var seconds = Math.ceil(self.timerMaxDuration - timeDiff);
            self.setState({
              roundStartTime: data.roundStartTime,
              owner: data.owner,
              gameState:data.gameState,
              gameStarted: gameStarted,
              playerScores: data.playerScores,
              currentRound: data.currentRound,
              maxCapacity: data.maxCapacity,
              roundTimeLeft: self.getTimeRemaining(data.roundStartTime)
            }, () => {
               $('#timerModal').modal('show');
               self.timerModalRef.current.startCountdown(seconds);
               self.timerCountdownRef.current.startCountdown(self.state.roundTimeLeft);
            }); 
            var timeoutFunc = setTimeout(function(){
              //console.log("Hiding timer modal");
              $('#timerModal').modal('hide');
              self.setState({
                roundStartTime: undefined
              });
            }, seconds * 1000);
            //console.log("timeoutFunc: ", timeoutFunc);
          return;
          }      
        }
        else{
          var roundTimeLeft = (data.roundStartTime === undefined) ? 
            0 : self.getTimeRemaining(data.roundStartTime);
          self.setState({
            owner: data.owner,
            gameState:data.gameState,
            gameStarted: gameStarted,
            playerScores: data.playerScores,
            currentRound: data.currentRound,
            maxCapacity: data.maxCapacity,
            roundStartTime: undefined,
            roundTimeLeft: roundTimeLeft
          },
          () => {
            if(self.state.gameState != 'lobby'){
              self.timerCountdownRef.current.startCountdown(self.state.roundTimeLeft);
            }
          }); 
        }
      }     
    })
    .catch(function(error){
      console.log(error);
    })
  }

	componentDidMount(){

    if(this.state.disconnect){
      return;
    }
    
		this.syncRoomState();
    $('#resultsModal').on('hidden.bs.modal', this.hideModalFunction);
    $('#errorModal').on('hidden.bs.modal', this.dismissErrorModal);
	}

  hideModalFunction = (e) => {
    hideModalCounter++;
    //console.log("Called hidemodalfunction: ", hideModalCounter);
    this.setState({
      showAnswerResultsModal: false
    }, 
    () => {
      if(this.state.roundStartTime && this.state.gameState === "question"){
        var timeDiff = (Date.now() - this.state.roundStartTime)/1000;
        //console.log("Remaining time (seconds): ", timeDiff);
        if(timeDiff > 1.0 && timeDiff < this.timerMaxDuration){
          var seconds = Math.ceil(this.timerMaxDuration - timeDiff);
          $('#timerModal').modal('show');
          this.timerModalRef.current.startCountdown(seconds);
        }
      }
    });
  }

  updatePlayersReady = (newPlayerList) => {
    var self = this;
    var newObj = {};

    for(let player of newPlayerList){
      newObj[player] = true;
    }

    this.setState({
      playersReady: newObj
    });
  }

  componentDidUpdate(prevProps){
    var self = this;
  }

  componentWillUnmount(){
    if(this.eventSource)
      this.eventSource.close();
  }

	render(){

    if(this.state.disconnect){
      var state = {};
      if(this.state.noPermission){
        state["noPermission"] = true;
      }
      else if(this.state.roomClosed){
        state["roomClosed"] = true;
      }

      return (<Redirect to={{
        pathname: "/lobby",
        state: state
      }}/>);
    }
    
		const isRoomOwner = this.state.username === this.state.owner;
    const padding = {
      'padding': '20px'
    };

    const navmenuStyle = {
      'background-color': '#e8e5e3',
      'margin-top': '10px',
      'margin-bottom': '10px'
    };

    const halfWidth = {
      width: '50%'
    };

		
		
		 return (
			<div style={padding}>
        <div className="row rounded generic_container" >
          <div className="col-sm">
            { this.state.gameState === "lobby" && (
              <GameRoomLobby playersReady={Object.keys(this.state.playerScores)}  
                maxCapacity={this.state.maxCapacity} roomId={this.state.roomId}/>
            )}
						{(this.state.gameState === 'question') 
							&& (
							<QuestionViewComponent
							username={this.state.username}
							roomId={this.state.roomId}
							round={this.state.currentRound}
              updatePlayersReady={this.updatePlayersReady}/>	
						)}
						{(this.state.gameState === 'answer') && (
							<AnswerViewComponent
  							username={this.state.username}
  							roomId={this.state.roomId}
  							round={this.state.currentRound}
                currRoomQuestionNum={this.state.currRoomQuestionNum}
                updatePlayersReady={this.updatePlayersReady}/>	
						)}
            {this.state.gameState === 'gameEnded'&& (
            <EndGameScreen playerScores={this.state.playerScores}
            />
          )}
          </div>
          { this.state.gameState != 'gameEnded' && 
            <div className="col">
              <div style={halfWidth}>
                {this.state.gameStarted && (
                  <div>
                    <ScoreBoardComponent playersReady={this.state.playersReady} scores={this.state.playerScores}/>
                    <TimerCountdown ref={this.timerCountdownRef}/>
                  </div>
                )}
              </div>
            </div>
          } 
        </div>
        <div className="row rounded generic_container">
          {(isRoomOwner && this.state.gameState === 'lobby') && (
            <button type="button" className="btn btn-primary btn_margin" 
              onClick={this.startGame}>Start</button>
          )}
          <button type="button" className="btn btn-danger btn_margin" 
            onClick={this.leaveRoom}>Leave room</button>
        </div>
        <AnswerResults 
          character={this.state.answer}
          submittedAnswers={this.state.submittedAnswers}/> 
        <TimerModal ref={this.timerModalRef}/>
        <ErrorModal errorMessage={this.state.errorMessage} /> 
			</div>
		);
				
	}
}

const GameRoomWithRouter = withRouter(GameRoom);

export default GameRoomWithRouter;
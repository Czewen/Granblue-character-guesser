import React, { Component } from 'react';
import axios from 'axios';
import ReactTable from 'react-table';
import "react-table/react-table.css";
import Modal from 'react-modal';
import update from 'immutability-helper'
import { Redirect } from 'react-router';

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

var counter = 0;

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
			<div>
				<ReactTable
				data={data}
				columns={columns}
				className="-striped -highlight"/>
			</div>);
	}
	else{
		return null;
	}
}

class GameRoom extends React.Component {
	constructor(props){
		super(props);
		var username = this.props.location == undefined ? this.props.username : this.props.location.state.username;
		if(username == undefined){
			username = this.props.username;
		}

		var roomId = this.props.match == undefined ? this.props.roomId : this.props.match.params.id;
		if(roomId == undefined){
			roomId = this.props.roomId;
		}

		this.state = {
			roomInfo: {},
			roomId: roomId,
			username: username,
			gameState: "lobby",
			disconnect: false,
			currentRound: 0
		}

		console.log("Game room props: ", this.props);
		console.log("Game room id: ", this.state.roomId);
		console.log(this.location);
		this.startGame = this.startGame.bind(this);
		this.handleEvent = this.handleEvent.bind(this);
		this.updateScores = this.updateScores.bind(this);
		this.leaveRoom = this.leaveRoom.bind(this);
		this.testUpdateScore = this.testUpdateScore.bind(this);
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;

		this.eventSource = new EventSource(API_base + '/api/rooms/eventstream' + params);
		this.eventSource.onmessage = (e) => this.handleEvent(JSON.parse(e.data));
	}

	startGame(){
		var params = "?room_id=" + this.state.roomInfo.id + "&username=" + this.state.username;
		axios.post(API_base + '/api/rooms/startGame' + params, {})
		.then(function(response){
			console.log("Start game response: ", response );
		})
		.catch(function(error){

		})
	}

	testUpdateScore(){
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
		console.log("called test update score");
		axios.get(API_base + '/api/rooms/testUpdateScore' + params, {})
		.then(function(response){
			console.log(response);
		})
		.catch(function(error){
			console.log("testUpdateScore err: ", error);
		})
	}

	handleEvent(eventData){
		console.log("handleEvent");

		switch(eventData.eventType){
			case 'scores':
				console.log('new scores: ', eventData.playerScores);
				this.updateScores(eventData.playerScores);
				break;
			case 'disconnect':
				console.log('host disconnected');
				this.setState({disconnect: true});
				break;
			case 'startQuestionRound':
				console.log('question round');
				this.setState({gameState: "questions", currentRound: eventData.currentRound});
				break;
			case 'startAnswerRound':
				console.log("answer round");
				this.setState({gameState: "answers"});
				break;
			case 'endGame':
				console.log("game ended");
				this.returnToLobby();
				break;
			default:
				console.log("Received unknown event: ", eventData.eventType);
		}
		
		// if(eventData.eventType === 'scores'){
		// 	console.log('new scores: ', eventData.playerScores);
		// 	this.updateScores(eventData.playerScores);
		// }
		// else if(eventData.eventType == 'disconnect'){
		// 	console.log('host disconnected');
		// 	this.setState({disconnect: true});
		// }
	}

	updateScores(newScores){
		var newRoomInfo = update(this.state.roomInfo, {playerScores: {$set: newScores}});
		this.setState({roomInfo: newRoomInfo});
	}

	leaveRoom(){
		var self = this;
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
		console.log("Leave room: ", this.state.roomId );
		axios.post(API_base +'/api/rooms/leave' + params, {})
		.then(function(response){
			console.log("leave response: ", response);
			console.log("room owner: ", self.state.roomInfo.owner);
			if(response.status == 200 && self.state.username != self.state.roomInfo.owner){
				this.returnToLobby();
			}
		})
		.catch(function(error){
				console.log("Error occured while trying to leave room: ", error);
		})
	}

	returnToLobby = () => {
		this.eventSource.close();
		self.props.history.push("/");
	}

	componentDidMount(){
		let self = this;
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
		console.log("GET from: ", API_base + '/api/rooms/room' + params);
		axios.get(API_base + '/api/rooms/room' + params, {})
		.then(function(response){
			console.log("response.data: ", response.data);
			self.setState({roomInfo: response.data});
			//just for testing purposes for now
			self.setState({gameStarted: true});
		})
		.catch(function(error){
			console.log(error);
		})
	}

	componentDidUpdate(){
		console.log("Game room update: ", counter);
		counter++;
	}

	render(){
		const isRoomOwner = this.state.username ===this.state.roominfo.owner;
		if(this.state.disconnect){
			return (<Redirect to="/"/>)
		}
		else{
			return (
					<div>
						<ScoreBoard gameStarted={this.state.gameStarted} 
								playerScores={this.state.roomInfo.playerScores}/>
						{isRoomOwner && (
							<button onClick={this.startGame}>Start</button>
						)}
							<button onClick={this.leaveRoom}>Leave room</button>
					</div>
			);
		}		
	}
}

export default GameRoom;
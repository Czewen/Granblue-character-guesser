import React, { Component } from 'react';
import axios from 'axios';
import ReactTable from 'react-table';
import "react-table/react-table.css";
import Modal from 'react-modal';
import update from 'immutability-helper'

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

var counter = 0;

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
			username: username
		}
		console.log("Game room props: ", this.props);
		console.log("Game room id: ", this.state.roomId);
		console.log(this.location);
		this.testUpdateScore = this.testUpdateScore.bind(this);
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
		this.scoreEventSource = new EventSource(API_base + '/api/rooms/eventstream' + params);
		this.scoreEventSource.onmessage = (e) => this.updateScores(JSON.parse(e.data));
	}

	testUpdateScore(){
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
		axios.get(API_base + '/api/rooms/testUpdateScore' + params, {})
		.then(function(response){
			console.log(response);
		})
		.catch(function(error){
			console.log("testUpdateScore err: ", error);
		})
	}

	updateScores(newScores){
		console.log("Called update scores");
		console.log(newScores);
		var newRoomInfo = update(this.state.roomInfo, {playerScores: {$set: newScores}});
		this.setState({roomInfo: newRoomInfo});
	}

	componentDidMount(){
		let self = this;
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomId;
		console.log("GET from: ", API_base + '/api/rooms/room' + params);
		axios.get(API_base + '/api/rooms/room' + params, {})
		.then(function(response){
			console.log("response.data: ", response.data);
			self.setState({roomInfo: response.data});
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
		var scores = this.state.roomInfo.playerScores == undefined ? 
				{} : this.state.roomInfo.playerScores;
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
		<div id="gameroom root">	
			<ReactTable
			data={data}
			columns={columns}
			className="-striped -highlight"/>
			<button>Test update score</button>
		</div>);

	}
}

export default GameRoom;
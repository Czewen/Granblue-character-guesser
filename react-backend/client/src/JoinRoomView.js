import React, { Component } from 'react';
import './App.css';
import axios from 'axios';

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

export default class JoinRoomView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			username: '',
			roomIdInput: this.props.joinRoomId
		};

		this.onChangeRoomId = this.onChangeRoomId.bind(this);
		this.onChangeUsername = this.onChangeUsername.bind(this);
		this.joinRoom = this.joinRoom.bind(this);
	}

	onChangeRoomId(event){
		//console.log("set room id: ", event.target.value);
		this.setState({roomIdInput: event.target.value});
	}

	onChangeUsername(event){
		//console.log("set username: ", event.target.value);
		this.setState({username: event.target.value});
	}

	joinRoom(){
		console.log("username: ", this.state.username);
		console.log("roomId: ", this.state.roomIdInput);
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomIdInput;
		console.log("params: ", params);
		axios.post(API_base + '/api/rooms/join' + params,{})
		.then(function(response){
			console.log("join room post success");
			console.log(response);
		})
		.catch(function(error){
			console.log(error);
		})
	}

	render(){
		return(
			<div>
			  <label htmlFor="username">Join as: </label>
			  <input type="text" id="username" required
	                value={this.state.username} onChange={this.onChangeUsername}></input>	
	          <label htmlFor="roomid">Room ID:</label>
	          <input type="text" id="roomid" name="roomid" required
	                value={this.state.roomIdInput || ''} onChange={this.onChangeRoomId}></input>
	          <button onClick={this.joinRoom}>Join</button>
	        </div>);
	}
}
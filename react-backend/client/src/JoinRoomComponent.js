import React, { Component } from 'react';
import './App.css';
import axios from 'axios';
import { withRouter } from 'react-router';

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

class JoinRoomComponent extends React.Component {
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
		var self = this;
		console.log("username: ", this.state.username);
		console.log("roomId: ", this.state.roomIdInput);
		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomIdInput;
		console.log("params: ", params);
		axios.post(API_base + '/api/rooms/join' + params,{})
		.then(function(response){
			console.log("join room post success");
			console.log(response);
			var data = response.data;
			if(response.status === 201){
				var path = '/room/' + self.state.roomIdInput;
        self.props.history.push({
          pathname: path,
          state: {username: self.state.username}
        })
			}
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

const JoinRoomComponentWithRouter = withRouter(JoinRoomComponent);

export default JoinRoomComponentWithRouter;
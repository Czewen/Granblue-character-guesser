import React from 'react'
import axios from 'axios'
import globalVals from './globalVals'
import { withRouter } from "react-router";

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

class CreateRoomComponent extends React.Component{
	constructor(props){
		super(props);
		this.state = {
      username: "",
			maxCapacity: 2,
		}

    this.onChangeCapacity = this.onChangeCapacity.bind(this);
    this.onChangeUsername = this.onChangeUsername.bind(this);
    this.createRoom = this.createRoom.bind(this);
	}

  createRoom(){
    console.log(this.state.maxCapacity);
    let self = this;
    console.log('axios.post');
    axios.post(API_base + '/api/rooms/create', {
      capacity: this.state.maxCapacity,
      owner: this.state.username,
      difficulty: "EASY"
    })
    .then(function(response){
      console.log("response: ", response);
      var data = response.data;
      if(data.success == true){
        var path = '/room/' + data.room_id;
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

  onChangeCapacity(event){
    this.setState({maxCapacity: event.target.value});
  }

  onChangeUsername(event){
    this.setState({username: event.target.value});
  }

	render(){
		return (
      <div>
        <div>
          <label htmlFor="username_input">Username:</label>
          <input type="text" id="username_input" required
            value={this.state.username} onChange={this.onChangeUsername}
            style={{'paddingLeft': '10px'}}/>
        </div>
  			<div style={{display: "inline"}}>
          <span>Number of players</span>
  				<select  value={this.state.maxCapacity} onChange={this.onChangeCapacity}>
  					<option value="2">2</option>
  					<option value="3">3</option>
  					<option value="4">4</option>
  				</select>
        </div>
        <div>
          <button onClick={this.createRoom}> Create room </button>
        </div>
			</div>
			);
	}
}

const CreateRoomComponentWithRouter = withRouter(CreateRoomComponent);

export default CreateRoomComponentWithRouter;
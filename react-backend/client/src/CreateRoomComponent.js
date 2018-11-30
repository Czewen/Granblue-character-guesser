import React from 'react'
import axios from 'axios'
import globalVals from './globalVals'
import { withRouter } from "react-router";
import $ from 'jquery';

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

class CreateRoomComponent extends React.Component{
	constructor(props){
		super(props);
    let capacityOptions = [];
    let maxRoundOptions = [];
    for(let i=2; i <= process.env.REACT_APP_ROOM_MAX_CAPACITY; i++){
      capacityOptions.push(i);
    }

    for(let i=1; i <= process.env.REACT_APP_ROOM_MAX_ROUNDS; i++){
      maxRoundOptions.push(i);
    }

		this.state = {
      username: "",
			maxCapacity: 2,
      maxRounds: 1,
      error: false,
      errorMessage: "",
      capacityOptions: capacityOptions,
      maxRoundOptions: maxRoundOptions
		}

    this.onChangeCapacity = this.onChangeCapacity.bind(this);
    this.onChangeUsername = this.onChangeUsername.bind(this);
    this.createRoom = this.createRoom.bind(this);
	}

  componentDidMount(){
    var self = this;
    $('#createRoomModal').on('hidden.bs.modal', function(){
      if(!self.state.navToRoom){
        self.setState({
          username: "",
          maxCapacity: 2,
          maxRounds: 1,
          error: false,
          errorMessage: ""
        });
      }
      else {
        var path = '/room/' + self.state.roomId;
        self.props.history.push({
          pathname: path,
          state: {username: self.state.username}
        })
      }
      
    });
  }

  createRoom(){
    let self = this;
    if(!this.state.username || this.state.username === ""){
      this.setState({
        error: true, 
        errorMessage: "Please enter a username."
      })
      return;
    }
    else if(this.state.username.length > 13){
      this.setState({
        error: true,
        errorMessage: "Please enter a username that is between 0 and 12 characters long."
      })
      return;
    }

    axios.post(API_base + '/api/rooms/create', {
      capacity: this.state.maxCapacity,
      owner: this.state.username,
      maxRounds: this.state.maxRounds,
      difficulty: "EASY"
    })
    .then(function(response){
      //console.log("response: ", response);
      var data = response.data;
      if(data.success == true){
        self.setState({
          roomId: data.room_id,
          navToRoom: true
        }, 
        () => {
          $('#createRoomModal').modal('toggle');
        })
      }      
    })
    .catch(function(error){
      //console.log(error);
      self.setState({
        error: true,
        errorMessage: "An error occured. Please try again."
      });
    })
  }

  onChangeCapacity(event){
    this.setState({
      maxCapacity: event.target.value
    });  
  }

  onChangeUsername(event){
    this.setState({
      username: event.target.value
    });
  }

  onChangeRounds = (event) => {
    this.setState({
      maxRounds: event.target.value
    });
  }

	render(){
    const marginBot = {
      'marginBottom': '10px'
    };

    const marginTop = {
      'marginTop': '10px'
    };

		return (
      <div className="modal fade" role="dialog" id="createRoomModal">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Create a room</h5>
              <a className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </a>
            </div>
            <div className="modal-body">
              <form>
                <div className="input-group input-group-sm" style={marginBot}>
                  <div className="input-group-prepend">
                    <span className="input-group-text">Username:</span>
                  </div>
                  <input type="text" className="form-control" placeholder="Username" id="createRoomUsernameInput"
                    aria-label="Username" value={this.state.username} onChange={this.onChangeUsername}/>
                </div>
                <div className="form-group">
                  <h6>
                    <label htmlFor="roomCapacitySelect" >Number of players:</label>
                  </h6>
                  <select className="form-control" id="roomCapacitySelect"
                    onChange={this.onChangeCapacity}>
                    {
                      this.state.capacityOptions.map(function(item, i){
                        return (
                          <option key={i} value={item}>{item}</option>
                        );
                      })
                    }
                  </select>
                </div>
                <div className="form-group">
                  <h6>
                    <label htmlFor="roomRoundsSelect" >Number of rounds:</label>
                  </h6>
                  <select className="form-control" id="roomRoundsSelect"
                    onChange={this.onChangeRounds}>
                    {
                      this.state.maxRoundOptions.map(function(item, i){
                        return (
                          <option key={i} value={item}>{item}</option>
                        );
                      })
                    }
                  </select>
                  { this.state.error && (
                    <div className="alert alert-danger" role="alert" style={marginTop}>{this.state.errorMessage}</div>
                  )}
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" 
                onClick={this.createRoom}> Create room </button>
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
  			</div>
      </div>
			);
	}
}

const CreateRoomComponentWithRouter = withRouter(CreateRoomComponent);

export default CreateRoomComponentWithRouter;
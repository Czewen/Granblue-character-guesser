import React from 'react';
import './App.css';
import axios from 'axios';
import { withRouter } from 'react-router';
import $ from 'jquery';

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

class JoinRoomComponent extends React.Component {
	constructor(props) {
		super(props);

    var roomId;
    if(this.props.joinRoomId){
      roomId = this.props.joinRoomId;
    }
    else{
      roomId = "";
    }

		this.state = {
			username: '',
			roomIdInput: roomId,
      error: false,
      errorMessage: "",
		};

		this.onChangeRoomId = this.onChangeRoomId.bind(this);
		this.onChangeUsername = this.onChangeUsername.bind(this);
		this.joinRoom = this.joinRoom.bind(this);
	}

	onChangeRoomId(event){
		this.setState({roomIdInput: event.target.value});
	}

	onChangeUsername(event){
		////console.log("set username: ", event.target.value);
		this.setState({username: event.target.value});
	}

  componentDidUpdate(prevProps){
    if(prevProps.joinRoomId != this.props.joinRoomId){
      this.setState({
        roomIdInput: this.props.joinRoomId
      });
    }
  }

  componentDidMount(){
    var self = this;
    $('#joinRoomModal').on('hidden.bs.modal', function(){
      if(self.state.joinRoom){
        var path = '/room/' + self.state.roomIdInput;
        self.props.history.push({
          pathname: path,
          state: {username: self.state.username}
        })
      }
      else{
        self.props.resetJoinRoomIdProp();
        self.setState({
          username: '',
          roomIdInput: '',
          error: false,
          errorMessage: ''
        });
      }        
    });
  }

	joinRoom(){
		var self = this;

    if(!this.state.username || this.state.username === ""){
      this.setState({
        error: true,
        errorMessage: "Please enter a username."
      });
      return;
    }
    else if(this.state.username.length > 12){
      this.setState({
        error: true,
        errorMessage: "Please enter a username that is between 0 and 12 characters long."
      })
      return;
    }    

    if(!this.state.roomIdInput){
      this.setState({
        error: true,
        errorMessage: "Please enter a room id."
      });
      return;
    }

		var params = "?username=" + this.state.username + "&room_id=" + this.state.roomIdInput;
		
    axios.put(API_base + '/api/rooms/join' + params,{})
		.then(function(response){
			var data = response.data;
			if(response.status === 200 && !response.data.error){
        self.setState({
          joinRoom: true,
        }, 
        () => {
          $('#joinRoomModal').modal('toggle');
        })
			}
      else{
        var errMsg = "";
        //console.log("JoinRoomComponent error: ", response.data);
        if(response.data.roomNotExist) {
          errMsg = "Room with id: " + self.state.roomIdInput + " does not exist.";
        }
        else if(response.data.gameStarted) {
          errMsg = "Game has already started.";
        }
        else if(response.data.roomFull){
          errMsg = "Room is full.";
        }
        else if(response.data.duplicateUsername){
          errMsg = "Username already taken. Please choose a different username.";
        }

        self.setState({
          error: true,
          errorMessage: errMsg
        });
        return;
      }
		})
		.catch(function(error){
			//console.log(error);
      self.setState({
        error: true,
        errorMessage: "An error occured. Please try again."
      })
		})
	}

	render(){

    const marginBot = {
      'marginBottom': '10px'
    };

    const marginTop = {
      'marginTop': '10px'
    };

    const marginLeft = {
      'marginLeft': '5px'
    };

		return (
      <div className="modal fade" role="dialog" id="joinRoomModal">
        <div className="modal-dialog" role="dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Join a room</h5>
              <a className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </a>
            </div>
            <div className="modal-body">
              <form>
                <div className="input-group input-group-sm" style={marginBot}>
                  <div className="input-group-prepend">
                    <span className="input-group-text" id="basic-addon1">Username:</span>
                  </div>
                  <input type="text" className="form-control" placeholder="Username" id="joinRoomUsernameInput"
                    aria-label="Username" value={this.state.username} 
                    onChange={this.onChangeUsername}/>
                </div>
                <div className="input-group input-group-sm">
                  <div className="input-group-prepend">
                    <span className="input-group-text" id="basic-addon1">Room ID:</span>
                  </div>
                  <input type="text" className="form-control" placeholder="Room id" id="joinRoomRoomIdInput"
                    aria-label="Username" value={this.state.roomIdInput} 
                    onChange={this.onChangeRoomId}/>
                </div>
                { this.state.error && (
                  <div className="alert alert-danger" role="alert" style={marginTop}>{this.state.errorMessage}</div>
                )}
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" 
                onClick={this.joinRoom}> Join </button>
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
	}
}

const JoinRoomComponentWithRouter = withRouter(JoinRoomComponent);

export default JoinRoomComponentWithRouter;
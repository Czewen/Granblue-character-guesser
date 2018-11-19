import React from 'react';
import $ from 'jquery';
import './css/homepage.css';
import CreateRoomComponent from './CreateRoomComponent';
import JoinRoomComponent from './JoinRoomComponent';

export default class Home extends React.Component {
  constructor(props){
    super(props);
  }

  goToLobby = () => {
    this.props.history.push({
      pathname: '/lobby',
      state: {}
    })
  }

  render() {
    const width = {
      'width': '100px'
    }

    const blackText = {
      'color': 'black'
    }
    return (
      <div className="bg">
        <div id="homeCardRoot"className="card text-center home_card">
          <img className="card-img-top" src="../assets/title.png"/>
          <ul className="list-group list-group-flush">
            <li id="homeCardListItem" className="list-group-item" onClick={this.goToLobby}>
              Lobby
            </li>
            <li id="homeCardListItem" className="list-group-item" data-toggle="modal"
                data-target="#createRoomModal">
              Create a new room
            </li>
            <li id="homeCardListItem" className="list-group-item" data-toggle="modal"
                data-target="#joinRoomModal">
              Join room
            </li>
          </ul>
        </div>
        <CreateRoomComponent/>
        <JoinRoomComponent/>
      </div>
    );
  }

}
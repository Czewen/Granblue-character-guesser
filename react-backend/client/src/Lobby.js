import React, { Component } from 'react';
import { withRouter as Router, Route, Link } from "react-router-dom";
import './App.css';
import Modal from 'react-modal';
import ReactTable from 'react-table';
import "react-table/react-table.css";
import JoinRoomComponent from './JoinRoomComponent'
import CreateRoom from './CreateRoomComponent'
import GameRoom from './GameRoom'


var API_base = (process.env.NODE_ENV === 'development') 
    ? 'http://localhost:3001'
    : 'http://localhost:3001';

const customStyles = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
};

Modal.setAppElement('#root')    

class Lobby extends Component {
  state = {
    rooms: [],
    showCreateModal: false,
    showJoinModal: false
  }
  constructor() {
    super();

    this.state = {
      rooms: [],
      createModalIsOpen: false,
      joinModalIsOpen: false,
      joinRoomId: "",
    };

    this.showCreateModal = this.showCreateModal.bind(this);
    this.showJoinModal = this.showJoinModal.bind(this);
    this.hideCreateModal = this.hideCreateModal.bind(this);
    this.hideJoinModal = this.hideJoinModal.bind(this);
    this.setRoomId = this.setRoomId.bind(this);
    this.joinRoom = this.joinRoom.bind(this);
  };

  showCreateModal(){
    this.setState({ createModalIsOpen: true});
  }

  showJoinModal(){
    this.setState({ joinModalIsOpen: true});
  }

  hideCreateModal(){
    this.setState({ createModalIsOpen: false});
  }

  hideJoinModal(){
    this.setState({ joinModalIsOpen: false});
  }

  setRoomId(event){
    this.setState({joinRoomId: event.target.value});
  }

  joinRoom(){
    console.log(this.state.joinRoomId);
  }

  componentDidMount() {
    var endpoint = API_base + '/api/rooms';
    fetch( endpoint, {
      headers: {"Accept": "application/json"}
    })
    .then(res => res.json())
    .then(rooms => this.setState({ rooms }));
  }

  render() {
    console.log(this.state.rooms);

    var columns = [{
      Header: 'Id',
      accessor: 'id' // String-based value accessors!
    }, {
      Header: 'Current capacity',
      accessor: 'curr_capacity',
      Cell: props => <span className='number'>{props.value}</span> // Custom cell components!
    }, {
      Header: 'Max capacity',
      accessor: 'max_capacity',
      Cell: props => <span className='number'>{props.value}</span> 
    }, {
      Header: 'Difficulty',
      accessor: 'difficulty'
    }]

    return (
      <div>
        <ReactTable 
        data={this.state.rooms} 
        columns={columns}
        defaultPageSize={10}
        className="-striped -highlight"/>
        <button onClick={this.showCreateModal}>Create room</button>
        <button onClick={this.showJoinModal}>Join room</button>
        <Modal
          isOpen={this.state.createModalIsOpen}
          onRequestClose={this.hideCreateModal}
          style={customStyles}>
          <div>
            <CreateRoom username={this.state.username}/>
            <button onClick={this.hideCreateModal}>Cancel</button>
          </div>
        </Modal>
        <Modal
          isOpen={this.state.joinModalIsOpen}
          onRequestClose={this.hideJoinModal}
          style={customStyles}>
          <JoinRoomComponent joinRoomId={this.state.joinRoomId}></JoinRoomComponent>
          <button onClick={this.hideJoinModal}>Cancel</button>
        </Modal>
        
      </div>)
  }

}

// /<GameRoom roomId="HOWDY" username="Lecia"></GameRoom>

export default Lobby;


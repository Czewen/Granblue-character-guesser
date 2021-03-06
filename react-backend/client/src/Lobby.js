import React from 'react';
import { withRouter as Router, Route, Link } from "react-router-dom";
import ReactTable from 'react-table';
import "react-table/react-table.css";
import InstructionsModal from './InstructionsModal';
import JoinRoomComponent from './JoinRoomComponent';
import CreateRoomComponent from './CreateRoomComponent';
import $ from 'jquery';
import "./css/my_styles.css";
import './App.css';

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

const customStyles = {
  content : {
    top                   : 'auto',
    left                  : 'auto',
    right                 : 'auto',
    bottom                : 'auto',
    // marginRight           : '-50%',
    //transform             : 'translate(-50%, -50%)'
  }
};

class Lobby extends React.Component {
  constructor() {
    super();

    this.state = {
      rooms: [],
      joinRoomId: "",
      testDescriptors: []
    };

    this.setRoomId = this.setRoomId.bind(this);
  };

  setRoomId(event){
    this.setState({joinRoomId: event.target.value});
  }

  componentDidMount() {
    var self = this;
    this.fetchRooms();
  }

  resetJoinRoomIdProp = () => {
    this.setState({
      joinRoomId: ""
    })
  }

  fetchRooms = () => {
    var endpoint = API_base + '/api/rooms';
    fetch( endpoint, {
      headers: {"Accept": "application/json"}
    })
    .then(res => res.json())
    .then(rooms => {
      console.log("Rooms: ", rooms);
      this.setState({ 
        rooms: rooms 
      })
    })
    .catch(error => {
      //console.log(error);
    });
  }

  onClickRow = (state, rowInfo, column, instance) => {
    var self = this;
    return {
      onClick: (e, handleOriginal) => {
        // //console.log("A Td Element was clicked!");
        // //console.log("it produced this event:", e);
        // //console.log("It was in this column:", column);
         //console.log("It was in this row:", rowInfo);
        // //console.log("It was in this table instance:", instance);
        //console.log(rowInfo.row.id);
        if(!rowInfo){
          return;
        }

        self.setState({
          joinRoomId: rowInfo.row.id
        },
        () => {
          $('#joinRoomModal').modal('show');
        })
      }
    };  
  }

  render() {
    // console.log(this.state.rooms);

    var columns = [{
      Header: 'Room Id',
      accessor: 'id' // String-based value accessors!
    }, 
    {
      Header: 'Room owner',
      accessor: 'owner'
    },
    {
      Header: 'Current capacity',
      accessor: 'curr_capacity',
      Cell: props => <span className='number'>{props.value}</span> // Custom cell components!
    }, {
      Header: 'Max capacity',
      accessor: 'max_capacity',
      Cell: props => <span className='number'>{props.value}</span> 
    }]
    //console.log("this.state: ", this.state);
    return (
      <div className="bg-white">
        <ReactTable 
        data={this.state.rooms} 
        columns={columns}
        defaultPageSize={10}
        className="-striped -highlight"
        getTdProps={this.onClickRow}/>
        <button type="button" className="btn btn-primary btn_margin" data-toggle="modal"
          data-target="#joinRoomModal">Join room</button>
        <button type="button" className="btn btn-primary" data-toggle="modal"
          data-target="#createRoomModal">Create room</button>
        <CreateRoomComponent/>
        <JoinRoomComponent joinRoomId={this.state.joinRoomId} resetJoinRoomIdProp={this.resetJoinRoomIdProp}/>
        <button type="button" className="btn btn-success btn_margin" onClick={this.fetchRooms}>
          Refresh</button>
        <button type="button" className="btn btn-info btn_margin" 
          data-toggle="modal" data-target="#instructionsModal">Instructions</button>
        <InstructionsModal/>
      </div>)
  }

}

// /<GameRoom roomId="HOWDY" username="Lecia"></GameRoom>

export default Lobby;


import React from 'react';


export default class GameRoomLobby extends React.Component {
  constructor(props){
    super(props);
  }

  render(){

    const style = {
      'width': '50%'
    }

    const marginBot = {
      'marginBottom': '10px'
    }

    var currCapacity = this.props.playersReady.length.toString();
    var maxCapacity = this.props.maxCapacity.toString();
    var playerListHeader = "Players in room (" + currCapacity + "/" + maxCapacity + "):";

    var roomIdStr = "Room ID: " + this.props.roomId;
    return (
      <div className="row ">
        <div className="col">
          <h4>How to play:</h4>
          <p>Each round consists of a describe phase and multiple guessing phase.</p>
          <p>During the describe phase, describe a Granblue Fantasy character using 3 words or less before time runs out.</p>
          <p>Durign the guessing phase, players can guess a character based on descriptions given before time runs out.</p>
          <p>1 point is awarded to the guesser and describer for each correct guess that is made.</p>
        </div>
        <div className="col">
          <div style={marginBot}>
            <h5>{roomIdStr}</h5>
          </div>
          <div style={style}>
            <h6>{playerListHeader}</h6>
            <ul className="list-group" >
              {
                this.props.playersReady.map(function(player, i){
                  return <li key ={i} className="list-group-item list-group-item-info">{player}</li>
                })
              }
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
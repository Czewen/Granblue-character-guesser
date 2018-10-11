import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import Lobby from './Lobby'
import GameRoom from './GameRoom'


export default class App extends Component {
  constructor() {
    super();
  };

  render() {
    return (
      <Router>
        <div>
          <Route path="/room/:id" component={GameRoom}/>
          <Route exact path="/" component={Lobby}/>
        </div>
      </Router>)
  };

}


import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import { Switch } from 'react-router';
import Lobby from './Lobby'
import GameRoom from './GameRoom'
import Home from './Home'

export default class App extends Component {
  constructor() {
    super();
  };

  render() {
    return (
      <Router>
        <Switch>
          <Route path="/room/:id" component={GameRoom}/>
          <Route exact path="/lobby" component={Lobby}/>
          <Route exact path="/" component={Home}/>
        </Switch>
      </Router>)
  };

}


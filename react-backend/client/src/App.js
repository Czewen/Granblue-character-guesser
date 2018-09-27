import React, { Component } from 'react';
import './App.css';

var API_base = (process.env.NODE_ENV === 'development') 
    ? 'http://localhost:3001'
    : 'http://localhost:3001';

class App extends Component {
  state = {users: []}

  componentDidMount() {
    console.log("help");
    var endpoint = API_base + '/api/users';
    fetch( endpoint, {
      headers:{
        "Accept":"application/json"
      }
    }).then(res => res.json())
      .then(users => this.setState({ users }));
  }

  render() {
    return (
      <div>
        <h1>Users</h1>
        {this.state.users.map(user =>
          <div key={user.id}>{user.username}</div>
        )}
      </div>
    );
  }
}

export default App;


import React from 'react';
import $ from 'jquery';

export default class TimerCountdown extends React.Component {
    constructor(props){
    super(props);
    this.state = {
      remainingTime: 0,
      intervalFunc: undefined
    };
  }

  resetCountdown = () => {
    if(this.state.intervalFunc){
      clearInterval(this.state.intervalFunc);
    }
    if(this.state.remainingTime > 0){
      this.setState({
        remainingTime: 0
      });
    }     
  }

  startCountdown = (duration) => {
    var self = this;

    if(this.state.intervalFunc){
      clearInterval(this.state.intervalFunc);
    }

    this.setState({
      remainingTime: duration
    }, 
    () => {
      var intervalFunc = setInterval(function(){
        if(self.state.remainingTime > 0){
          self.setState({
            remainingTime: self.state.remainingTime - 1
          });
        }
        else{
          clearInterval(self.state.intervalFunc);
          self.setState({
            intervalFunc: undefined
          })
        } 
      }, 1000);

      self.setState({
        intervalFunc: intervalFunc 
      })
    });
  }

  componentWillUnmount(){
    if(this.state.intervalFunc){
      clearInterval(this.state.intervalFunc);
    }
  }

  render() {

    const textCenter = {
      'textAlign': 'center'
    }

    // var text = this.state.remainingTime.toString() + " seconds";
    
    return (  
      <div className="alert alert-info">
        <h3 style={textCenter}>Time remaining:</h3>
        <h3 style={textCenter}>{this.state.remainingTime}</h3>
      </div>
    );
  }
}
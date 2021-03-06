import React from 'react';
import $ from 'jquery';

export default class TimerModal extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      remainingTime: 0,
      intervalFunc: undefined
    };

  }

  startCountdown = (duration) => {
    var self = this;
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

  render(){

    const textCenter = {
      textAlign: "center"
    };
    var text = this.state.remainingTime.toString() + " seconds";

    return (<div className="modal fade" id="timerModal" 
        data-backdrop="static" data-keyboard="false">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header" style={textCenter}>
            Next round begins in:
          </div>

          <div className="alert alert-info">
            <h3 style={textCenter}>Time remaining:</h3>
            <h3 style={textCenter}>{text}</h3>
          </div>
        </div>
      </div>

    </div>);
  }
}
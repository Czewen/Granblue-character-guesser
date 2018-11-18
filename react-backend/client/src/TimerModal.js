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

  startCountDown = (duration) => {
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

    const textAlign = {
      textAlign: "center"
    };

    return (<div className="modal fade" id="timerModal" 
        data-backdrop="static" data-keyboard="false">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header" style={textAlign}>
            Next round begins in:
          </div>

          <div className="modal-body" style={textAlign}>
            <h3>{this.state.remainingTime}</h3>
          </div>
          <div className="modal-footer">

          </div>
        </div>
      </div>

    </div>);
  }
}
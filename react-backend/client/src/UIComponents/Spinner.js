import React from 'react';
import '../css/spinner.css'
import '../css/my_styles.css'

export default class Spinner extends React.Component {
  constructor(props){
    super(props)
  };

  render(){
    if(this.props.message){
      return (
        <div id="spinner-container" className="d-flex alert alert-info">
          <div className="inline spinner-text">
            <strong>{this.props.message}</strong>
          </div>
          <div class="inline lds-ring"><div></div><div></div><div></div></div>
        </div>
      );
    }
    else{
      return (
        <div class="lds-ring"><div></div><div></div><div></div></div>
      );
    }
  };

}
import React from 'react';
import '../css/my_styles.css'

export default class SubmittedDescriptionsList extends React.Component {
  constructor(props){
    super(props)
  }

  render() {
    if(this.props.descriptions === undefined ){
        return null;
    }

    var descriptions;
    if (this.props.descriptions.constructor === Array) {
      descriptions = this.props.descriptions;
    }
    else if(typeof this.props.descriptions === 'string' || this.props.descriptions instanceof String){
      descriptions = this.props.descriptions.split(",");
    }
    else{
      return null;
    }

    var descriptionText = "";
    for(var i=0; i < descriptions.length; i++){
      descriptionText += descriptions[i];

      if(i != descriptions.length - 1){
         descriptionText += ", "
      }
    }

    var headerText;
    if(this.props.textOverride != undefined) {
      headerText = this.props.textOverride;
    }
    else {
      headerText = "Submitted descriptions:";
    }

    return (
      <div className="input-group padding_5px">
        <div className="input-group-prepend">
          <span className="input-group-text bg-info text-white">{headerText}</span>
        </div>
        <input type='text' className="form-control" placeholder={descriptionText} disabled={true}/>
      </div>
    );
  }
}
import React from 'react';
import ImageCard from './ImageCard';
import '../css/my_styles.css';
import '../css/characterProfileCard.css'

export default class CharacterProfileCard extends React.Component {
  constructor(props){
    super(props);
  }

  render() {

    const marginTop = {
      marginTop: '10px'
    }

    const left = {
      'float': 'left'
    };

    var element = this.props.character.element.toLowerCase();
    var innerBorderId = "border_override_" + element;
    var listGroupItemId = "list-group-item_override_" + element;

    var restrictedWordsStr = "";
    for(var i = 0; i<this.props.restrictedWords.length; i++){
      restrictedWordsStr += this.props.restrictedWords[i];

      if(i != this.props.restrictedWords.length - 1){
        restrictedWordsStr += ", "
      }
    }

    return (
      <div>
        <div className="row">
          <div className="col-sm bg-white">
            <ImageCard src={this.props.imgSrc} width="480px" height="400px"/>
          </div>
          <div className="col-sm">
            <div className="card" style={marginTop}>
              <ul className="list-group list-group-flish">
                <li id={listGroupItemId} className="list-group-item" >
                  <div id={innerBorderId} className="list-group-item-padding card_list_item_left inline" >Name:</div>
                  <div className="list-group-item-padding card_list_item_right inline">{this.props.character.name}</div>
                </li>
                <li id={listGroupItemId} className="list-group-item">
                  <div id={innerBorderId} className="list-group-item-padding card_list_item_left inline" >Element:</div>
                  <div className="list-group-item-padding card_list_item_right inline">{this.props.character.element}</div>
                </li>
                <li id={listGroupItemId} className="list-group-item">
                  <div id={innerBorderId} className="list-group-item-padding card_list_item_left inline" >Race:</div>
                  <div className="list-group-item-padding card_list_item_right inline">{this.props.character.race}</div>
                </li>
                <li id={listGroupItemId} className="list-group-item">
                  <div id={innerBorderId} className="list-group-item-padding card_list_item_left inline" >Weapon:</div>
                  <div className="list-group-item-padding card_list_item_right inline">{this.props.character.weapon}</div>
                </li>
                <li id={listGroupItemId} className="list-group-item">
                  <div id={innerBorderId} className="list-group-item-padding card_list_item_left inline" >Style:</div>
                  <div className="list-group-item-padding card_list_item_right inline">{this.props.character.style}</div>
                </li>
                <li id={listGroupItemId} className="list-group-item">
                  <div id={innerBorderId} className="list-group-item-padding card_list_item_left inline" >Restricted words:</div>
                  <div className="list-group-item-padding card_list_item_right inline">{restrictedWordsStr}</div>
                </li>
              </ul>    
            </div>
          </div>    
        </div>
      </div>
    );
  }
}
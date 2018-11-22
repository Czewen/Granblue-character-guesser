import React from 'react';
import axios from 'axios';
import update from 'immutability-helper';
import DescribeCharacterInput from '../UIComponents/DescribeCharacterInput';
import CharacterProfileCard from './CharacterProfileCard';
import SubmittedDescriptionsList from './SubmittedDescriptionsList';
import Spinner from '../UIComponents/Spinner';
import '../css/my_styles.css';

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

function HasSubmittedDescriptionDialog(props){
  if(props.descriptions === undefined ){
    return null;
  }

  var descriptionText = "";
  for(var i=0; i < props.descriptions.length; i++){
    descriptionText += props.descriptions[i];

    if(i != props.descriptions.length - 1){
      descriptionText += ", "
    }
  }

  return (
    <div className="input-group padding_5px">
      <div className="input-group-prepend">
        <span className="input-group-text bg-info text-white">You submitted these descriptions:</span>
      </div>
      <input type='text' className="form-control" placeholder={descriptionText} disabled={true}/>
    </div>
  );
}

export default class QuestionViewComponent extends React.Component{

	constructor(props){
		super(props);
		this.state = {
			character: {},
			questionId: undefined,
      hasSubmittedAnswer: true,
			descriptions: [],
			restrictedWords: [],
      restrictedWordsLookup: {},
			charImgSrc: "",
      error: false,
      errorMessage: "",
		};

    this.inputRef = React.createRef();
		this.updateDescriptions = this.updateDescriptions.bind(this);
	};

	componentDidMount(){
    //console.log("Question view props: ", this.props);
		var params = "?username=" + this.props.username +"&room_id=" + this.props.roomId + "&round=" + this.props.round;
		//console.log("getMyQuestion params: ", params );

		var self = this;
		axios.get(API_base + '/api/rooms/getMyQuestion' + params, {})
		.then(function(response){
			//console.log("getMyQuestion: ", response);
      
      var characterName = response.data.character.name;
      var nameParts = characterName.split(" ");
      if(nameParts.length > 1){
        characterName = "";
        for(var i=0; i<nameParts.length; i++){
          characterName += nameParts[i];
          if(i != nameParts.length - 1){
            characterName += "_";
          }
        }
      }

			var imgSrc = "../assets/" + characterName + ".png"

      var descriptionSubmitted = [];
      if(response.data.hasSubmittedDescription){
        descriptionSubmitted = response.data.question.description.split(",");
      }

      var restrictedWordsLookup = {};
      var restrictedWords;
      if(response.data.character.restrictedWords === ""){
        restrictedWords = [];
      }
      else{
        restrictedWords = response.data.character.restrictedWords.split(",");
      }


      for(let key of Object.keys(response.data.character)){
        if(key != "storyExclusive" && key != "characterId" && key != "restrictedWords"){
          if(key.toLowerCase === 'weapon'){
            for(var weapon of response.data.character[key].split(",")){
              restrictedWords.push(weapon.trim());
            }
          }
          else{
            restrictedWords.push(response.data.character[key]);
          }
        }
      }

      //console.log("restrictedWords: ", restrictedWords);

      for(var word of restrictedWords){
        restrictedWordsLookup[word.trim().toLowerCase()] = true;
      }

			self.setState({
				character: response.data.character,
				questionId: response.data.question.id,
				charImgSrc: imgSrc,
        restrictedWords: restrictedWords,
        hasSubmittedDescription: response.data.hasSubmittedDescription,
        descriptions: descriptionSubmitted,
        restrictedWordsLookup: restrictedWordsLookup
			});
      
      self.props.updatePlayersReady(response.data.playersReady);
		})
		.catch(function(error){
			//console.log("QuestionViewComponent axios error: ", error);
		});
	};



	submitDescriptions = () => {
		//console.log("descriptions to submit: ", this.state.descriptions);
		var body = {
			questionId: this.state.questionId,
			room_id: this.props.roomId,
			description: this.state.descriptions.toString(),
			username: this.props.username
		};

    var self = this;
    //console.log("inputRef: ", this.inputRef);

    //console.log("Num descriptions: ", this.state.descriptions.length);
    if(this.state.descriptions.length > 3){
      this.setState({
        error: true,
        errorMessage: "Please enter no more than 3 descriptions."
      });
      return;
    }

    var invalidWords = [];
    for(var description of this.state.descriptions){
      if(this.state.restrictedWordsLookup[description.trim().toLowerCase()]){
        invalidWords.push(description);
      }
    }

    if(invalidWords.length > 0){
      var errMsg = "";
      var msgEnd = invalidWords.length === 1 ?
        " is a restricted word." : " are restricted words.";

      for(var i = 0; i<invalidWords.length; i++){
        errMsg += invalidWords[i];
        if(i != invalidWords.length - 1){
          errMsg +=", ";
        }
      }

      errMsg += msgEnd;
      this.setState({
        error: true,
        errorMessage: errMsg
      })
      return;
    }

		axios.post(API_base + '/api/rooms/submitDescription', body)
		.then(function(response){
			if(response.status === 200){
				if(response.data.error){
					//report error on the ui
          self.setState({
            error: true,
            errorMessage: response.data.message
          })
				}
				else{
					//report answers submitted
					self.setState({
            hasSubmittedDescription: true,
            error: false,
            errorMessage: ""
          })
				}
			}
		})
		.catch(function(error){
			//console.log("Tried to submit descriptions: ", error);
		});
	}

	updateDescriptions(newDescriptions){
		this.setState({
			descriptions: newDescriptions
		});
	}

	render() {
    const marginTop = {
      'marginTop': '5px'
    }

    const padding = {
      'padding': '10px'
    }


    const textAlign ={
      'textAlign': 'center'
    }

		return (
			<div id="questionViewRoot" >
        <h5 style={textAlign}>Describe this character to other players using no more than 3 words.</h5>
        { (Object.keys(this.state.character).length > 0) && 
          <CharacterProfileCard imgSrc={this.state.charImgSrc} character={this.state.character}
            restrictedWords={this.state.restrictedWords}/>
        }
  			{ !this.state.hasSubmittedDescription && 
          <DescribeCharacterInput
  				  descriptors={this.state.descriptions}
  				  updateFunction={this.updateDescriptions}
            ref={this.inputRef}/>
        }
				{ !this.state.hasSubmittedDescription && (
          <button type="submit" className="btn btn-primary" style={marginTop}
            onClick={this.submitDescriptions}>
           Submit descriptions
          </button>
        )}
        {
          this.state.error && (
            <div className="alert alert-danger margin_top_5px">
              {this.state.errorMessage}
            </div>
        )}
        { this.state.hasSubmittedDescription && (
          <div>
            <SubmittedDescriptionsList descriptions={this.state.descriptions}/>
            <Spinner message="Waiting on other players"/>
          </div>
        )}
			</div>
		)
	}
}



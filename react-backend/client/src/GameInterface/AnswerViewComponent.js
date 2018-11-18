import React from 'react';
import axios from 'axios';
import CharacterSelectInput from '../UIComponents/CharacterSelectInput';
import Modal from 'react-modal';
import SubmittedDescriptionsList from './SubmittedDescriptionsList';
import ImageCard from './ImageCard';
import '../css/my_styles.css';

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

function Descriptions(props){
	const divStyle = {
		display: 'inline'
	};

	if(!props.descriptions)
		return null;
	var arr = props.descriptions.split(",");
	console.log("props descriptiosn: ", props.descriptions);
	return (
		<div className="inline">
			{
				arr.map(function(item, i){
					return <span 
						key= {i} className="bg-success text-white description">{item}</span>
				})
			}
		</div>
	);
}

function SubmittedAnswerList(props){
	//will change to look better later
	if(!props.answers){
		return null;
	}
	var arr = Object.keys(props.answers);
	return (
		<div id="submittedAnswers">
			{
				props.answers.map(function(username, i){
					var answerObj = props.answers[username];
					var text = username + "answer: " + answerObj.answer 
						+ ", correct: " + answerObj.correct;
					return (
						<p key={i}>{text}</p>
					) 
				})
			}
		</div>
	);
}

export default class AnswerViewComponent extends React.Component {
	constructor(props){
		super(props);
		this.state = {
			question: {},
      submittedAnswer: undefined,
      charImgSrc: "",
      error: false,
      hasAnswered: false,
      errorMessage: "",
      characterSuggestions: []
		};

    this.characterSelectInputRef = React.createRef();
	}

	componentDidMount(){
		this.getRoomQuestion();
    this.getCharacterSuggestions();
	};

	getRoomQuestion = () => {
		var params = "?room_id=" + this.props.roomId + "&username=" + this.props.username;
		var self = this;

		axios.get(API_base + '/api/rooms/roomQuestion' + params, {})
		.then(function(response){
			console.log("roomQuestion response: ", response);
      if(!response.data.error){

        if(response.data.question.owner != self.props.username){

          var imgSrc = "";
          if(response.data.hasAnswered){
            imgSrc = '../assets/' + response.data.submittedAnswer + '.png';
          }

          self.setState({
            question: response.data.question,
            submittedAnswer: response.data.submittedAnswer,
            charImgSrc: imgSrc,
            hasAnswered: response.data.hasAnswered,
            error: false
          });
        }
        else{
          var imgSrc = '../assets/' + response.data.character.name + '.png';
          self.setState({
            question: response.data.question,
            charImgSrc: imgSrc,
            submittedAnswer: false,
            error: false
          });
        }

        self.props.updatePlayersReady(response.data.playersReady);
      }
      else{
        self.setState({
          error: true,
          errorMessage: response.data.message
        });
      }		
		})
		.catch(function(error){
			console.log("roomQuestion error: ", error);
		})
	};

  getCharacterSuggestions = () => {
    var self = this;

    axios.get(API_base + '/api/characters')
    .then(function(response){
      //console.log("Character suggestions response: ", response);
      self.setState({
        characterSuggestions: response.data
      })
    })
    .catch(function(error){
      console.log("Error when fetching character names: ", error);
    })
  }

	submitAnswer = () => {

    var self = this;

    console.log("CharacterSelectInputRef: ", this.characterSelectInputRef);
    var answer = this.characterSelectInputRef.current.state.value;

    if(answer === ""){
      this.setState({
        error: true,
        errorMessage: "Please enter an answer"
      });
      return;
    }

		var body = {
			questionId: this.state.question.id,
			room_id: this.props.roomId,
			username: this.props.username,
			answer: answer
		};

		console.log("Answer body: ", body);
		axios.post(API_base + '/api/rooms/submitAnswer', body)
		.then(function(response){
			console.log("Submit answer: ", response);
      self.setState({
        error: false,
        submittedAnswer: answer,
        hasAnswered: true
      }, () => {

      });
		})
		.catch(function(error){
			console.log("Submit answer error: ", error);
		})
	};

	onCharacterSelect = (character) => {
    //console.log("onCharacterSelect: ", character);
    var characterName = character.trim();
    var nameParts = character.split(" ");
    if(nameParts.length > 1){
      characterName = "";
      for(var i=0; i<nameParts.length; i++){
        characterName += nameParts[i];

        if(i != nameParts.length - 1){
          characterName += "_";
        }
      }
    }
    var imgSrc = '../assets/' + characterName + '.png';
		this.setState({
			charImgSrc: imgSrc
		});
	}

  componentDidUpdate(prevProps){
    if(prevProps.currRoomQuestionNum != this.props.currRoomQuestionNum){
      console.log("Component did update: call getRoomQuestion" );
      this.getRoomQuestion();
    }
  }

	render() {

		var assetRoot = "../assets/character_";
		var modalBaseStyle = {
			'border-radius': '25px',
			'margin': '10px 10px 10px 10px'
		}

    const placeHolderBackground = {
      'width': '300px',
      'height': '300px'
    }

    const autoSuggestDivStyle = {
      'width': '35%'
    }
    console.log("render question ", this.state.question);
    console.log("username: ", this.props.username);
		return (
			<div>
        { this.state.question.owner != this.props.username && (
          <div>
            <h5>
              <strong>Guess the character based on the descriptions provided.</strong>
            </h5>
            <ImageCard src={this.state.charImgSrc} width="480px" height="400px"/>
    				<SubmittedDescriptionsList descriptions={this.state.question.description}/>
      			{ !this.state.hasAnswered && (
              <div className="margin_bottom_5px">
      					<div className="inline" style={autoSuggestDivStyle}>
                  <CharacterSelectInput ref={this.characterSelectInputRef} 
                    onCharacterSelect={this.onCharacterSelect} characters={this.state.characterSuggestions}/>
                </div>
                <div className="inline btn_margin">
                  <button type="button" className="btn btn-primary inline" 
                    onClick={this.submitAnswer}>Guess</button>
                </div>
    				  </div>
            )}
            { this.state.hasAnswered && (
              <div>
              { "Your guess for this round is " + this.state.submittedAnswer + ". " }
              </div> 
            )}
          </div>
        )}
        { this.state.question.owner === this.props.username && (
          <div>
            <ImageCard src={this.state.charImgSrc} width="480px" length="400px"/>
            <SubmittedDescriptionsList descriptions={this.state.question.description} 
              textOverride="You described this character using these words:"/>
          </div>
        )}
        { this.state.error && (
          <div className="alert alert-danger margin_top_5px">
            {this.state.errorMessage}
          </div>
        )}
			</div>
		);
	}
};
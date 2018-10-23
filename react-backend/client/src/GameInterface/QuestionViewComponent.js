import React from 'react';
import axios from 'axios';
import update from 'immutability-helper'
import DescribeCharacterInput from '../UIComponents/DescribeCharacterInput'

var API_base = (process.env.NODE_ENV === 'development') 
    ? process.env.REACT_APP_DEV_SERVER
    : process.env.REACT_APP_PROD_SERVER;

class QuestionViewComponent extends React.component{

	constructor(props){
		super(props);
		this.state = {
			character: {},
			questionId: undefined,
			descriptions: [],
		};
	}

	componentDidMount(){
		var params = "?username=" + this.props.username +"&room_id=" + this.props.roomId + "&round=" + this.props.round;
		var self = this;
		axios.get(API_base + '/api/rooms/getMyQuestion', {})
		.then(function(response){
			self.setState({
				character: response.data.character,
				questionId: response.data.question.id
			});
		})
		.catch(function(error){
			console.log("QuestionViewComponent axios error: ", error);
		})
	}

	submitDescriptions = () => {
		var body {
			questionId: this.state.questionId,
			room_id: this.props.roomId,
			answers: this.state.descriptions
		};

		axios.post(API_base + '/api/rooms/submitDescription', body)
		.then(function(response){
			if(response.status === 200){
				if(response.data.error){
					//report error on the ui
				}
				else{
					//report answers submitted
					console.log(response);
				}
			}
		})
		.catch(function(error){
			console.log("Tried to submit descriptions: ", error);
		})
	}

	render() {
		var hasCharData = (this.state.character === undefined);
		var charImgSrc = "";

		if(hasCharData){
			charImgSrc = "../assets/character_" + this.state.character.character_id;
		}

		return (
			<div id="questionViewRoot">
				{hasCharData && 
					<img src={charImgSrc} width="720px" length="600px"/>
				}
				<DescribeCharacterInput
					descriptors={this.state.descriptions}/>
				<button type="submit" onClick={this.submitDescriptions}>
					Submit descriptions
				</button>
			</div>
		)
	}
}


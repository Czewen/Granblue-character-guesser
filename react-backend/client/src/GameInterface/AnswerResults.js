import React from 'react';
import '../css/my_styles.css';

export default class AnswerResults extends React.Component{
  constructor(props){
    super(props);
  }

  winnerMessage = (names) => {
    if(names === undefined){
      return "<p></p>";
    }

    if(names.length === 0){
      return "<p>0 players answered correctly this round.</p>";
    }

    var htmlString = "<p>";

    for(var i = 0; i<names.length; i++){
      htmlString = htmlString + "<strong>" + names[i] + "</strong>";

      if(i != names.length-1){
        htmlString += ", "
      }
    }
    htmlString += " answered correctly this round. </p>";
    return htmlString;
  }

  render() {
    if(this.props.character === undefined){
      return (
        <div className="modal" id="resultsModal">
          <div className="modal-dialog">
            <div>
              <div className="modal-header">
              </div>

              <div className="modal-body">
              </div>

              <div className="modal-footer">
              </div>
            </div>
          </div>
        </div>
      );
    }

    //console.log("props.character ", this.props.character);
    var submittedAnswers = this.props.submittedAnswers;
    var names = Object.keys(this.props.submittedAnswers);

    var correctPlayers = [];
    var incorrectPlayers = [];
    for(var name of names){
      if(submittedAnswers[name].correct){
        correctPlayers.push(name);
      }
      else{
        incorrectPlayers.push(name);
      }
    }

    var winMsg = this.winnerMessage(correctPlayers);

    const boldText = {
      'font-weight': 'bold'
    }
    var title = "The correct answer is " + this.props.character.name;

    var characterName = this.props.character.name;
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

    var characterName = this.props.character.name;
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
    var imgSrc = "../assets/" + characterName + ".png";

    //console.log(winMsg);
    //console.log(imgSrc);

    return (
      <div className="modal" id="resultsModal">
        <div className="modal-dialog">
          <div className="modal-content">
            
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <a className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </a>
            </div>

            <div className="modal-body">
              <img src={imgSrc} width="480px" length="400px"/>
              <div dangerouslySetInnerHTML={{__html: winMsg}}/>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" data-dismiss="modal">Next</button>
            </div>

          </div>
        </div>
      </div>
    );
  }
}
import React from 'react';
import ScoreBoardComponent from './ScoreBoardComponent';

export default class EndGameScreen extends React.Component{
  constructor(props){
    super(props);
  }

  render(){

    return (
      <div id="EndGameScreenRoot">
        <h5>
          <strong>Final scores: </strong>
        </h5>
        <ScoreBoardComponent scores={this.props.playerScores}/>
      </div>
    );
  }
}
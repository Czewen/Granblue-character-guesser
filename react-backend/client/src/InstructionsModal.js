import React from 'react';


export default class InstructionsModal extends React.Component {

  
  render(){
    const textCenter = {
      'textAlign': 'center'
    }
    return (<div className="modal fade" role="dialog" id="instructionsModal">
        <div className="modal-dialog" role="dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" style={textCenter}><strong>How to play:</strong></h5>
              <a className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </a>
            </div>
            <div className="modal-body">
              <p>Each round consists of a describe phase and multiple guessing phase.</p>
              <p>During the describe phase, describe a Granblue Fantasy character using 3 words or less before time runs out.</p>
              <p>Durign the guessing phase, players can guess a character based on descriptions given before time runs out.</p>
              <p>1 point is awarded to the guesser and describer for each correct guess that is made.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>);
  }


}
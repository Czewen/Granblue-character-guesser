import React from 'react';

export default class ErrorModal extends React.Component{
  constructor(props){
    super(props);
  }

  render(){
    return (<div className="modal fade" id="errorModal" role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-body">
            <div className="alert alert-danger">
              {this.props.errorMessage}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>);
  }
}
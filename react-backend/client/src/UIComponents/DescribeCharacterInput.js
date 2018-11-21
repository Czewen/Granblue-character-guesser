import React from 'react'

export default class DescribeCharacterInput extends React.Component{
	constructor(props){
		super(props);

		this.state = {
			'inputVal': "",
			'descriptors': this.props.descriptors,
      inputDisabled: (this.props.descriptors.length >= 3),
      submitDisabled: (this.props.descriptors.length > 3),
      error: false,
      errMessage: ''
		};

		//console.log(this.props);
	};

  tooManyDescriptions = () => {
    this.setState({
      submitDisabled: true,
      error: true,
      errorMessage: "Please enter no more than 3 descriptions."
    })
  }

  enableSubmit = () => {
    this.setState({
      submitDisabled: false,
      error: false,
      errorMessage: ''
    })
  }

	onChange = (event) => {
    var numDescriptions = event.target.value.split(" ").length + this.state.descriptors.length;

    this.setState({
     	inputVal: event.target.value
    },
    () => {
      if(numDescriptions > 3){
        this.tooManyDescriptions();
      }
      else if(this.state.submitDisabled){
        this.enableSubmit();
      }
    });
  }

  onKeyPress = (event) => {
  	////console.log("keypress: ", event.key);
  	if(event.key === 'Enter'){
  		var newArr = this.state.descriptors.slice(0, this.state.descriptors.length);

      var values = this.state.inputVal.split(" ");
      var numDescriptions = values.length + newArr.length;

      if(numDescriptions > 3){
        return;
      }

  		for(var value of values){
        if(value !== ""){
          newArr.push(value);
        }
      }
  		this.setState({
  			descriptors: newArr,
  			inputVal: ""
  		}, () => {
        this.props.updateFunction(newArr);
      });
  	}
  };

  setDescriptions = () => {
    var newDescriptions = this.state.inputVal.split(" ");
    
    var numDescriptions = newDescriptions.length + this.state.descriptors.length;
    if(numDescriptions > 3){
      return;
    }

    var newArr = this.state.descriptors.concat(newDescriptions);

    this.setState({
      inputVal: "",
      descriptors: this.state.descriptors.concat(newDescriptions)
    }, () => {
      this.props.updateFunction(this.state.descriptors);
    });
  };

  removeDescription = (index) => {
    //console.log("Remove description index: ", index);
    var newDescriptors = this.state.descriptors.slice(0);
    //console.log("new descriptors before splice: ", newDescriptors);
    newDescriptors.splice(index, 1);
    //console.log("new descriptors after splice: ", newDescriptors);
    this.setState({
      descriptors: newDescriptors
    }, () => {
      //console.log("descriptors: ", this.state.descriptors);
      this.props.updateFunction(this.state.descriptors);
      if(this.state.descriptors.length <= 3){
        if(this.state.descriptors.length == 3){
          this.setState({
            submitDisabled: false,
            inputDisabled: true,
            error: false,
            errMessage: ''
          })
        }
        else{
          this.setState({
            submitDisabled: false,
            inputDisabled: false,
            error: false,
            errMessage: ''
          })
        }
      }
    })
  };

  render(){

 		const divStyle = {
 			display: "inline"
 		};

 		const margins = {
      'marginTop': '10px',
      'marginBottom': '10px'
    }

    const descriptorDivStyle = {
      'width': '200px',
      'padding': '10px',
      'display': 'inline',
      'height': '30px',
      'textAlign': 'center',
    }

    const style = {
      height: '30px',
    }

    const closeButtonMargin = {
      'marginLeft': '5px'
    }

    var self = this;

  	return (
      <div id="DescribeCharacterInputRoot" style={margins}>
    		<div className="input-group mb-3">
          <div className="input-group-prepend">
            <span className="input-group-text bg-info text-white">Description:</span>
          </div>
    			<input type="text" 
            className="form-control"
            placeholder="Enter a description"
      			value={this.state.inputVal}
      			onChange={this.onChange}
      			onKeyPress={this.onKeyPress}
            disabled={this.state.inputDisabled}/>
          <div className="input-group-append">
            <button className="btn btn-info" onClick={this.setDescriptions} 
              disabled={this.state.submitDisabled}>Enter</button>
          </div>
    		</div>
        {
          this.state.error && (
            <div className="alert alert-danger">{this.state.errorMessage}</div>
          )
        }
        <div>
          <span className="bg-info text-white rounded" style={descriptorDivStyle}> Descriptions entered: </span>
          <div style={divStyle}>
            {
              this.state.descriptors.map(function(item, i){
                return (<span className="bg-info text-white description" key={i}>
                  <span>{item}</span>
                  <i className="fas fa-times" style={closeButtonMargin} onClick={() => {self.removeDescription(i)}} />
                </span>
                );
              })
            }
          </div>
        </div>
      </div>
  	)
  };

}
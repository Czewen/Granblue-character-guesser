import React from 'react'

export default class DescribeCharacterInput extends React.Component{
	constructor(props){
		super(props);

		this.state = {
			'inputVal': "",
			'descriptors': this.props.descriptors
		};

		console.log(this.props);
	};

	onChange = (event) => {
    this.setState({
     	inputVal: event.target.value
    });
  };

  onKeyPress = (event) => {
  	//console.log("keypress: ", event.key);
  	if(event.key === 'Enter'){
  		var newArr = this.state.descriptors.slice(0, this.state.descriptors.length);

      var values = this.state.inputVal.split(",");
  		for(var value of values){
        if(value != ""){
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
    var newDescriptions = this.state.inputVal.split(",");
    var self = this;
    this.setState({
      inputVal: "",
      descriptors: this.state.descriptors.concat(newDescriptions)
    }, () => {
      this.props.updateFunction(this.state.descriptors);
    });
  };

  removeDescription = (index) => {
    console.log("Remove description index: ", index);
    var newDescriptors = this.state.descriptors.slice(0);
    console.log("new descriptors before splice: ", newDescriptors);
    newDescriptors.splice(index, 1);
    console.log("new descriptors after splice: ", newDescriptors);
    this.setState({
      descriptors: newDescriptors
    }, () => {
      console.log("descriptors: ", this.state.descriptors);
      this.props.updateFunction(this.state.descriptors);
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
      			onKeyPress={this.onKeyPress}/>
          <div className="input-group-append">
            <button className="btn btn-info" onClick={this.setDescriptions}>Enter</button>
          </div>
    		</div>
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
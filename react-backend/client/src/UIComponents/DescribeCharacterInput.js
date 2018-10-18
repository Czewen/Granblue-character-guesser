import React from 'react'

export default class DescribeCharacterInput extends React.Component{
	constructor(props){
		super(props);

		this.state = {
			'inputVal': "",
			'descriptors': this.props.descriptors
		};
	};

	onChange = (event) => {
		console.log("On change: ", event.target.value);
    this.setState({
     	inputVal: event.target.value
    });
  };

  onKeyPress = (event) => {
  	console.log("keypress: ", event.key);
  	if(event.key === 'Enter'){
  		var newArr = this.state.descriptors.slice(0, this.state.descriptors.length);
  		newArr.push(this.state.inputVal);
  		this.setState({descriptors: newArr});
  	}
  }

  render(){

 		const divStyle = {
 			display: "inline"
 		};

 		const spanStyle = {
 			margin: '10px'
 		};

  	return (
  		<div>
  			<input type="text" 
  			value={this.state.inputVal}
  			onChange={this.onChange}
  			onKeyPress={this.onKeyPress}/>
  			<div>
	  			<div style={divStyle}>
	  				{
	  					this.state.descriptors.map(function(item, i){
	  						return <span key={i} style={spanStyle}>{item}</span>
	  					})
	  				}
	  			</div>
	  		</div>
  		</div>
  	)
  };

}
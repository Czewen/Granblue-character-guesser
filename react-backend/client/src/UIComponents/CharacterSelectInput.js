import React from 'react';
import Autosuggest from 'react-autosuggest';
import '../css/CharacterSelectInput.css'; 

// https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
function escapeRegexCharacters(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
 
export default class CharacterSelectInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: '',
      suggestions: [],
    };

    this.getSuggestions = this.getSuggestions.bind(this);
  }

  onChange = (event, { newValue, method }) => {
    this.setState({
      value: newValue
    });
    //this.props.onCharacterSelect(newValue);
  };
  
  onSuggestionsFetchRequested = ({ value }) => {
    this.setState({
      suggestions: this.getSuggestions(value)
    });
  };

  onSuggestionsClearRequested = () => {
    this.setState({
      suggestions: []
    });
  };

  getSuggestions(value) {
	  const escapedValue = escapeRegexCharacters(value.trim());
	  
	  if (escapedValue === '') {
	    return [];
	  }

	  const regex = new RegExp('^' + escapedValue, 'i');

	  return this.props.characters.filter(character => regex.test(character.name));
	}


	getSuggestionValue = (suggestion) => {
    console.log(this.props.onCharacterSelect);
    this.props.onCharacterSelect(suggestion.name);
  	return suggestion.name;
	}

	renderSuggestion(suggestion) {
  	return (
    	<span>{suggestion.name}</span>
  	);
	}

  render() {
    const { value, suggestions } = this.state;
    const inputProps = {
      placeholder: "Enter a character name",
      value,
      onChange: this.onChange
    };

    return (
      <Autosuggest 
        suggestions={suggestions}
        onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
        onSuggestionsClearRequested={this.onSuggestionsClearRequested}
        getSuggestionValue={this.getSuggestionValue}
        renderSuggestion={this.renderSuggestion}
        inputProps={inputProps} />
    );
  }
}

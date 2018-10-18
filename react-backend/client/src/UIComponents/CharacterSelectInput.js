import React from 'react';
import Autosuggest from 'react-autosuggest'; 

const gbf_characters = [
	{
		"name": "Lecia",
		"id": 3040101000
	},
	{
		"name": "Rosetta",
		"id": 3040068000
	}
]

// https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
function escapeRegexCharacters(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
 
export default class CharacterSelectInput extends React.Component {
  constructor() {
    super();

    this.state = {
      value: '',
      suggestions: [],
      characters: gbf_characters,

    };

    this.getSuggestions = this.getSuggestions.bind(this);
  }

  onChange = (event, { newValue, method }) => {
    this.setState({
      value: newValue
    });
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

	  return this.state.characters.filter(character => regex.test(character.name));
	}

	getSuggestionValue(suggestion) {
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
      placeholder: "Type 'c'",
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

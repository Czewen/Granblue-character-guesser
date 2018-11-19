import React from 'react';
import '../css/my_styles.css';
import '../css/image_card.css'

function ImageModal(props){
  if(props.src === undefined)
    return null;

  const zeroOpacity = {
    'opacity': '0.0'
  }

  const fullOpacity = {
    'opacity': '1.0'
  }
  //console.log("props src: ", props.src);
  return (
    <div className="modal" role="img" id="imageModal" tabIndex="-1">
      <div className="modal-dialog">
        <img src={props.src} className="fullOpacity" onerror={props.placeholder}/>
      </div>
    </div>
  );
}

export default class ImageCard extends React.Component {
  constructor(props){
    super(props);
  }

  render(){

    var placeholderSrc = "../assets/placeholder.png";
    var imgSrc = this.props.src;

    if(this.props.src === ""){
      imgSrc = placeholderSrc;
    }

    const divBackground = {
      width: this.props.width,
      height: this.props.height,
      'backgroundImage': 'url("' + imgSrc +'")',
      'backgroundRepeat': 'no-repeat',
    };

    // <img src={imgSrc} width={this.props.width} height={this.props.height}
          // data-target="#imageModal" data-toggle="modal"/>

    return (
      <div>
        <img src={imgSrc} width={this.props.width} height={this.props.height}
          data-target="#imageModal" data-toggle="modal"/>
        <ImageModal src={imgSrc} placeholder={placeholderSrc}/>
      </div>
    )
  }

}
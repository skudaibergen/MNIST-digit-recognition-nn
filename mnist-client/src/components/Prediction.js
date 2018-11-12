import React, { Component } from 'react';

class Prediction extends Component {

  render() {
    const { prediction } = this.props;

    return (
      <div className="prediction-number">{ prediction }</div>
    );
  }
}

export default Prediction;

import React, { Component } from 'react';
import logo from './style/logo.svg';
import './style/App.css';

import Canvas from './components/Canvas';
import Prediction from './components/Prediction';

import api from './api/api';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      prediction: null
    }
  }

  sendData = (data) => api.sendMnistData(data)
      .then(resData => this.setState({ prediction: resData.prediction }))

  render() {
    const { prediction } = this.state;

    return (
      <div className="App ui container">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-link">MNIST Digit recognition</h1>
        </header>

        <div className="centered">
          <Canvas sendData={data => this.sendData(data)} />
          <Prediction prediction={prediction} />
        </div>
      </div>
    );
  }
}

export default App;

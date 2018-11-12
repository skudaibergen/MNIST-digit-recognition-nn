import express from 'express';
import bodyParser from 'body-parser';

import { loadMnistData } from './mnist_data_importer';
import Network from './network';

const app = express();

const network = new Network([784, 30, 10]);
let trainingData = [];

app.use(bodyParser.json());

app.post('/prediction', (req, res) => {
  res.json({ prediction: network.evaluate(req.body) });
});

app.listen(3012, () => {
  console.log('api started...')

  loadMnistData("train.csv").then(data => {
    console.log("data loaded");
    // removing the headers from csv
    trainingData = data.slice(1);
    train();
  });
});

function train() {
  network.sgd(trainingData, 30, 10, 0.1);
}

import { default as nj } from 'numjs';
import { zip, range, shuffle, idxOfMax, parseInt } from './utils';
import Ziggurat from './ziggurat';

var counter = 0;

class Network {

  constructor(sizes) {
    this.sizes = sizes;
    this.layersNum = sizes.length;

    // Gaussian (normal) distribution with standart deviation = 1, mean = 0
    // Using Ziggurat algorithm
    this.weights = this._initWeights(sizes);
    this.biases = this._initBiases(sizes);
  }

  feedForward(a) {
    // tupple[0] - biases at n-th layer, tupple[1] - weights at n-th layer
    for (let tupple of zip([this.biases, this.weights]))
      a = this.sigmoid(nj.dot(tupple[1], a).add(tupple[0]));
    return a;
  }

  sgd(trainingData, epochs, miniBatchSize, alpha) {
    // mini-batch stochastic gradient descent
    for (let j = 0; j < epochs; j++) {
      shuffle(trainingData);

      const miniBatches = [];
      for (let i = 0; i < trainingData.length; i+=miniBatchSize)
        miniBatches.push(trainingData.slice(i, i + miniBatchSize))

      for (let miniBatch of miniBatches) {
        this.updateMiniBatch(miniBatch, alpha);
        counter++;
      }
    }

    console.log('mmm, feeling educated...');
  }

  updateMiniBatch(miniBatch, alpha) {
    // nablaW and nablaB - gradient vectors matrixes;
    // alpha is a learning rate
    let nablaW = this._initNablaW(),
        nablaB = this._initNablaB();

    for (let mb of miniBatch) {
      mb = parseInt(mb);

      const targetInput = nj.array([mb.slice(1)]).T;

      let targetOutput = new Array(10).fill(0);
      targetOutput[mb[0]] = 1;
      targetOutput = nj.array([[...targetOutput]]).T;

      const delta = this.backProp(targetInput, targetOutput);

      let nablaBTmp = [],
          nablaWTmp = [];
      for (let tupple of zip([nablaB, delta.nablaB]))
        nablaBTmp.push(tupple[0].add(tupple[1]));

      for (let tupple of zip([nablaW, delta.nablaW]))
        nablaWTmp.push(tupple[0].add(tupple[1]));

      nablaB = nablaBTmp;
      nablaW = nablaWTmp;
    }
    // Updating weights, tupple[0] is prev Weight, tupple[1] is delta Weight
    let eta = alpha / miniBatch.length;

    let zippedWeights = zip([this.weights, nablaW]);
    for (let tupple of zippedWeights)
      this.weights[zippedWeights.indexOf(tupple)] = tupple[0].subtract((tupple[1].multiply(eta)));

    // Updating biases
    let zippedBiases = zip([this.biases, nablaB]);
    for (let tupple of zippedBiases)
      this.biases[zippedBiases.indexOf(tupple)] = tupple[0].subtract((tupple[1].multiply(eta)));
  }

  backProp(x, y) {
    const nablaW = this._initNablaW(),
          nablaB = this._initNablaB();

    let activation = x,
        activations = [x],
        zs = []; // array of z's

    // feedforward
    for (let tupple of zip([this.biases, this.weights])) {
      let z = nj.dot(tupple[1], activation).add(tupple[0]);
      zs.push(z);
      activation = this.sigmoid(z);
      activations.push(activation);
    }
    if (counter % 1000 === 0)
      this.printCost(activations[activations.length - 1], y) // prints the error cost

    let dcost_da = this.costDerivative(activations[activations.length - 1], y);
    let da_dz = this.sigmoidPrime(zs[zs.length - 1]);
    // dz_db = 1 so it is scipped
    let dz_dw = activations[activations.length - 2]
    let dcost_db = dcost_da.multiply(da_dz);
    // change in cost with respect to weights
    let dcost_dw = nj.dot(dcost_db, dz_dw.T);

    nablaW[nablaW.length - 1] = dcost_dw;
    nablaB[nablaB.length - 1] = dcost_db;

    for (let l of range(2, this.layersNum)) {
      let z = zs[zs.length - l]; // L-1 th activation vector, where L is a Last layer label
      da_dz = this.sigmoidPrime(z);
      dcost_db = nj.dot(this.weights[this.weights.length - l + 1].T, dcost_db).multiply(da_dz);

      dz_dw = activations[activations.length - l - 1];
      dcost_dw = nj.dot(dcost_db, dz_dw.T);

      nablaB[nablaB.length - l] = dcost_db;
      nablaW[nablaW.length - l] = dcost_dw;
    }
    return { nablaW, nablaB };
  }

  evaluate(data) {
    const input = nj.array([data]).T; // N x 1 input matrix
    const output = this.feedForward(input);

    console.log('============================================');
    console.log('output', output.tolist());
    return idxOfMax(output.T.tolist()[0]);
  }

  printCost(pred, target) {
    let err = pred.subtract(target);
    console.log('target:', target.tolist());
    console.log('loop:', counter, '||', 'error cost:', err.multiply(err).sum());
    console.log();
  }

  costDerivative(pred, target) {
    // dcost_da = 2 * (pred - target)
    return pred.subtract(target).multiply(2);
  }

  sigmoid(z) {
    // matrice of ones
    const ones = nj.ones(z.shape);
    // denominator: 1 + e^(-x)
    const d = nj.exp(nj.negative(z)).add(ones)
    // returns the matrix of 1 / 1 + e^(-x)
    return ones.divide(d);
  }

  sigmoidPrime(z) {
    const ones = nj.ones(z.shape);
    // sigm(z) * (1 - sigm(z))
    return this.sigmoid(z).multiply(ones.subtract(this.sigmoid(z)));
  }

  _initWeights(sizes) {
    const weights = [];
    var zigg = new Ziggurat();

    for (let z of zip([sizes.slice(0, -1), sizes.slice(1)])) {

      let arr = [];

      for (let i = 0; i < z[1]; i++) {
        let subArr = [];
        for (let j = 0; j < z[0]; j++) {
          subArr.push(zigg.nextGaussian());
        }
        arr.push(subArr);
      }
      let w = nj.array(arr);
      weights.push(w);
    }

    return weights;
  }

  _initBiases(sizes) {
    const biases = [];
    var zigg = new Ziggurat();

    for (let s of sizes.slice(1)) {
      let arr = [];

      for (let i = 0; i < s; i++) {
        let subArr = [];
        subArr.push(zigg.nextGaussian());
        arr.push(subArr);
      }
      let b = nj.array(arr);
      biases.push(b);
    }

    return biases;
  }

  _initNablaB() {
    const nablaB = [];

    for (let b of this.biases)
      nablaB.push(nj.zeros(b.shape));

    return nablaB;
  }

  _initNablaW() {
    const nablaW = [];

    for (let w of this.weights)
      nablaW.push(nj.zeros(w.shape));

    return nablaW;
  }

}

export default Network;

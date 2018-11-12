import React, { Component } from 'react';
import { Button } from 'semantic-ui-react';

class Canvas extends Component {
  constructor(props) {
    super(props);

    this.state = {
      displayOriginal: true,
      displayBounded: false
    }

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.endPaintEvent = this.endPaintEvent.bind(this);
  }

  isPainting = false;
  prevPos = { offsetX: 0, offsetY: 0 };
  userStrokeStyle = '#000000';

  componentDidMount() {
    this.canvas.id = "canvas";
    this.canvas.width = 240;
    this.canvas.height = 240;
    this.canvas.style.cursor = 'crosshair';

    this.initContext();
  }

  initContext() {
    this.context = this.canvas.getContext('2d');
    this.context.globalCompositeOperation = 'source-over';
    this.context.globalAlpha = 1;
    this.context.strokeStyle = 'rgba(0,0,0,1)';
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.context.lineWidth = 8;
  }

  sendImageData(data) {
    this.props.sendData(data);
  }

  contextIsEmpty = () => Object.keys(this.context).length === 0 && this.context.constructor === Object;

  onMouseDown = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    this.isPainting = true;
    this.prevPos = { offsetX, offsetY };
  }

  onMouseMove = ({ nativeEvent }) => {
    if (this.isPainting) {
      const { offsetX, offsetY } = nativeEvent;
      const offSetData = { offsetX, offsetY };

      if (this.contextIsEmpty())
        this.initContext();

      this.paint(this.prevPos, offSetData, this.userStrokeStyle);
    }
  }

  onBoundedMouseDown = () => {
    this.setState({ displayOriginal: true, displayBounded: false });
  }

  paint(prevPos, currPos, strokeStyle) {
    const { offsetX, offsetY } = currPos;
    const { offsetX: x, offsetY: y } = prevPos;

    this.context.beginPath();
    this.context.strokeStyle = strokeStyle;
    // Move the the prevPosition of the mouse
    this.context.moveTo(x, y);
    // Draw a line to the current position of the mouse
    this.context.lineTo(offsetX, offsetY);
    // Visualize the line using the strokeStyle
    this.context.stroke();
    this.prevPos = { offsetX, offsetY };
  }

  clearAll() {
    const originalCanvas = this.canvas;
    const boundedCanvas = document.getElementById('bounded-canvas');

    const originalCtx = originalCanvas.getContext('2d');
    const boundedCtx = boundedCanvas.getContext('2d');

    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    boundedCtx.clearRect(0, 0, boundedCanvas.width, boundedCanvas.height);

    this.setState({ displayOriginal: true, displayBounded: false });
  }

  endPaintEvent() {
    if (this.isPainting) {
      this.isPainting = false;

      this.scaleDownToMNIST();

      console.log('ImageData', this.getMnistImageData());

      this.setState({ displayOriginal: false, displayBounded: true });

      this.sendImageData(this.getMnistImageData());
    }
  }

  getMnistImageData() {
    const mnistCanvas = document.getElementById('mnist-canvas');
    const mnistCtx = mnistCanvas.getContext('2d');

    const imgData = mnistCtx.getImageData(0, 0, mnistCanvas.width, mnistCanvas.height);
    const imgBlack = [];

    for (let i = 0; i < imgData.data.length; i += 4) {
      imgBlack.push(imgData.data[i + 3])
    };

    return imgBlack;
  }

  scaleDownToMNIST() {
    const originalCanvas = this.canvas;
    const boundedCanvas = document.getElementById('bounded-canvas');
    const mnistCanvas = document.getElementById('mnist-canvas');
    // boundedCanvas.style.display = 'none'
    const originalCtx = originalCanvas.getContext('2d');
    const boundedCtx = boundedCanvas.getContext('2d');
    const mnistCtx = mnistCanvas.getContext('2d');

    const imgData: ImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

    const data = imgData.data;
    const pixels: number[][] = [[]];

    let row = 0;
    let column = 0;
    for (let i = 0; i < originalCanvas.width * originalCanvas.height * 4; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3] / 255;

      if (column >= originalCanvas.width) {
        column = 0;
        row++;
        pixels[row] = [];
      }
      pixels[row].push(Math.round(a * 100) / 100);

      column++;
    }

    const boundingRectangle = this.getBoundingRectangle(pixels);

    const array = pixels.reduce(
      (arr, row) => [].concat(arr, row.reduce(
        (concatedRow, alpha) => [].concat(concatedRow, [0, 0, 0, alpha * 255]), []))
    , []);

    const clampedArray =  new Uint8ClampedArray(array);
    const bounded = new ImageData(clampedArray, boundedCanvas.width, boundedCanvas.height);

    boundedCtx.putImageData(bounded, 0, 0);

    boundedCtx.beginPath();
    boundedCtx.lineWidth= '1';
    boundedCtx.strokeStyle= 'red';
    boundedCtx.rect(
      boundingRectangle.minX,
      boundingRectangle.minY,
      Math.abs(boundingRectangle.minX - boundingRectangle.maxX),
      Math.abs(boundingRectangle.minY - boundingRectangle.maxY),
    );
    boundedCtx.stroke();

    // Vector that shifts an image to the center of the mass.
    const trans = this.centerImage(pixels); // [dX, dY] to center of mass

    // copy image to hidden canvas, translate to center-of-mass, then
    // scale to fit into a 200x200 box (see MNIST calibration notes on
    // Yann LeCun's website)

    var brW = boundingRectangle.maxX + 1 - boundingRectangle.minX;
    var brH = boundingRectangle.maxY + 1 - boundingRectangle.minY;

    // Get width and height of the bounding box of the segmented digit.
    const brW = boundingRectangle.maxX + 1 - boundingRectangle.minX;
    const brH = boundingRectangle.maxY + 1 - boundingRectangle.minY;
    // Set the scaling factor in a way that will uniformy decarease width and height of bounding box so that it fits 20x20pixel window
    const scalingFactor = 20 / Math.max(brW, brH);

    // Reset the drawing.
    var img = mnistCtx.createImageData(100, 100);
    for (var i = img.data.length; --i >= 0; )
      img.data[i] = 0;
    mnistCtx.putImageData(img, 100, 100);

    // Reset the tranforms
    mnistCtx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear the canvas.
    mnistCtx.clearRect(0, 0, mnistCanvas.width, mnistCanvas.height);

    // Ensure that 20x20 square that bound the digit is centered on 28x28 canvas.
    // mnistCtx.translate(4, 4);

    /**
     * This is just for demo and should be removed.
     * Drawing centered 20x20 rectrangle centerad at 28x28 canvas.

    mnistCtx.beginPath();
    mnistCtx.lineWidth= '1';
    mnistCtx.strokeStyle= 'green';
    mnistCtx.rect(4, 4, 20, 20);
    mnistCtx.stroke();
    */

    mnistCtx.translate(
      -brW * scalingFactor / 2,
      -brH * scalingFactor / 2
    );
    mnistCtx.translate(
      mnistCtx.canvas.width / 2,
      mnistCtx.canvas.height / 2
    );
    mnistCtx.translate(
      -Math.min(boundingRectangle.minX, boundingRectangle.maxX) * scalingFactor,
      -Math.min(boundingRectangle.minY, boundingRectangle.maxY) * scalingFactor
    );
    mnistCtx.scale(scalingFactor, scalingFactor);
    mnistCtx.drawImage(originalCtx.canvas, 0, 0);
  }

  getBoundingRectangle(img: number[][], threshold = 0.01) {
    const rows = img.length;
    const columns= img[0].length;

    let minX = columns;
    let minY = rows;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        if (img[y][x] > 1 -  threshold) {
          if (minX > x) minX = x;
          if (maxX < x) maxX = x;
          if (minY > y) minY = y;
          if (maxY < y) maxY = y;
        }
      }
    }
    return { minY, minX, maxY, maxX };
  }

  /**
   * Evaluates center of mass of digit, in order to center it.
   * Note that 1 stands for black and 0 for white so it has to be inverted.
   */
  centerImage(img) {
    var
      meanX     = 0,
      meanY     = 0,
      rows      = img.length,
      columns   = img[0].length,
      pixel     = 0,
      sumPixels = 0,
      y         = 0,
      x         = 0;

    for (y = 0; y < rows; y++) {
      for (x = 0; x < columns; x++) {
        // pixel = (1 - img[y][x]);
        pixel = img[y][x];
        sumPixels += pixel;
        meanY += y * pixel;
        meanX += x * pixel;
      }
    }
    meanX /= sumPixels;
    meanY /= sumPixels;

    const dY = Math.round(rows/2 - meanY);
    const dX = Math.round(columns/2 - meanX);

    return {transX: dX, transY: dY};
  }

  render() {
    const { displayOriginal, displayBounded } = this.state;

    return (
      <div className="canvas-container">
        <canvas
          ref={ref => this.canvas = ref}
          onMouseMove={this.onMouseMove}
          onMouseDown={this.onMouseDown}
          onMouseUp={this.endPaintEvent}
          onMouseLeave={this.endPaintEvent}
          className={!displayOriginal ? 'hidden' : ''} />

        <canvas
          height="240" width="240"
          id="bounded-canvas"
          onMouseDown={this.onBoundedMouseDown}
          className={!displayBounded ? 'hidden' : ''} />

        <div className="mnist-canvas-container">
          <Button primary content="Clear" onClick={() => this.clearAll()}></Button>

          <h5>Pattern:</h5>
          <div>
            <canvas
              height="28" width="28"
              id="mnist-canvas"
              className={''} />
          </div>
        </div>
      </div>
    );
  }
}

export default Canvas;

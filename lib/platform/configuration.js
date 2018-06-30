var configKey = {
  WEB_ORIENTATION_PORTRAIT: 0,
  WEB_ORIENTATION_LANDSCAPE_LEFT: -90,
  WEB_ORIENTATION_PORTRAIT_UPSIDE_DOWN: 180,
  WEB_ORIENTATION_LANDSCAPE_RIGHT: 90,
  ORIENTATION_PORTRAIT: 1,
  ORIENTATION_LANDSCAPE: 2,
  ORIENTATION_AUTO: 3,
};

export default class Configuration {
  constructor(app) {
    this._app = app;
    this._key = configKey;
    this._frameSize = [0, 0];
    this._resizeOrientation();
    this._orientation = this._key.ORIENTATION_AUTO;
    this._webOrientationRotate = this._key.WEB_ORIENTATION_PORTRAIT;
    this._isRotate = false;
  }

  get key() {
    return this._key;
  }

  get webOrientationRotate() {
    return this._webOrientationRotate;
  }

  setOrientation(orientation) {
    orientation = orientation & this._key.ORIENTATION_AUTO;
    if (orientation && this._orientation !== orientation) {
      this._orientation = orientation;
      this._resizeOrientation();
    }
  }

  windowResize() {
    this._resizeOrientation();
  }

  _resizeOrientation() {
    let availSize = this._app.availSize;
    if (!this._app.availSize || availSize.x <= 0 || availSize.y <= 0) {
      return;
    }

    let w = this._app.availSize.x;
    let h = this._app.availSize.y;
    var isLandscape = w >= h;
    let containerStyle = this._app._container.style;
    if (
      !this._app.sys.isMobile ||
      (isLandscape && this._orientation & this._key.ORIENTATION_LANDSCAPE) ||
      (!isLandscape && this._orientation & this._key.ORIENTATION_PORTRAIT)
    ) {
      this._frameSize[0] = w;
      this._frameSize[1] = h;
      containerStyle["-webkit-transform"] = "rotate(0deg)";
      containerStyle.transform = "rotate(0deg)";
      containerStyle.margin = '0px';
      this._webOrientationRotate = this._key.WEB_ORIENTATION_PORTRAIT;
    } else {
      this._frameSize[0] = h;
      this._frameSize[1] = w;
      containerStyle["-webkit-transform"] = "rotate(90deg)";
      containerStyle.transform = "rotate(90deg)";
      containerStyle["-webkit-transform-origin"] = "0px 0px 0px";
      containerStyle.transformOrigin = "0px 0px 0px";
      let frameH = this._frameSize[1];
      containerStyle.margin = "0 0 0 " + frameH + "px";
      this._webOrientationRotate = this._key.WEB_ORIENTATION_LANDSCAPE_RIGHT;
    }

    this._resizeCanvasSize();
  }

  _resizeCanvasSize() {
    let canvas = this._app._canvas;
    let w = this._frameSize[0],
      h = this._frameSize[1];

    canvas.width = w;
    canvas.height = h;
  }
}
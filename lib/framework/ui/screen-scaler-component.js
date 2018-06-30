import UIElementComponent from './ui-element-component';
import * as utils from '../../vmath';

export default class ScreenScalerComponent extends UIElementComponent {
  tick() {
    let screen = this._entity && this._entity.getComp('Screen');
    if (!screen) {
      return;
    }

    let canvas = this._app._canvas;
    let aspect = [canvas.width / screen.width, canvas.height / screen.height];
    if (this._adaptionMode === 'match-width-or-height') {
      let w = Math.log2(aspect[0]);
      let h = Math.log2(aspect[1]);
      let p = utils.lerp(w, h, this._match);
      this._scaleFactor = Math.pow(2, p);
    } else if (this._adaptionMode === 'expand') {
      this._scaleFactor = Math.min(aspect[0], aspect[1]);
    } else if (this._adaptionMode === 'shrink') {
      this._scaleFactor = Math.max(aspect[0], aspect[1]);
    }

    screen.scaleFactor = this._scaleFactor;
  }
}

ScreenScalerComponent.schema = {
  adaptionMode: {
    type: 'enums',
    default: 'none',
    options: ['none', 'match-width-or-height', 'expand', 'shrink'],
    set(val) {
      if (this._adaptionMode === val) {
        return;
      }

      this._adaptionMode = val;
    }
  },

  match: {
    type: 'number',
    default: 0.0,
  },

  scaleFactor: {
    type: 'number',
    default: 1,
    set(val) {
      if (this._scaleFactor === val) {
        return;
      }

      if (this._adaptionMode !== 'none') {
        return;
      }

      this._scaleFactor = val;
    }
  }
}
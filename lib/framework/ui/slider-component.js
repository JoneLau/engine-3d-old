import UIElementComponent from './ui-element-component';
import { vec3, color4 } from '../../vmath';
import * as utils from '../../vmath';
import { Entity } from '../../ecs';

export default class SliderComponent extends UIElementComponent {
  constructor() {
    super();
    this._state = 'none';
    this._calMinValue = 0.0;
    this._calMaxValue = 1.0;
    this._highlighting = false;
    this._pressing = false;
    this._widget = null;
    this._dragging = false;
    this._bgImage = null;
    this._handleWidget = null;
    this._fillWidget = null;
    this._lastAxis = 'horizontal';
    this._normalizedValue = 0.0;// range[0,1]
    this._reverse = false;
    this._fingerId = -1;

    // mouse events
    this._onMouseEnter = (e) => {
      if (this.enabled === false) {
        return;
      }

      let widgetSys = this._widget.system;
      this._highlighting = true;

      if (
        widgetSys.focusedEntity === this._entity &&
        e.buttons & 1 !== 0
      ) {
        this._pressing = true;
      }

      this._updateState();
    };

    this._onMouseLeave = () => {
      if (this.enabled === false) {
        return;
      }

      let widgetSys = this._widget.system;

      this._pressing = false;
      if (
        widgetSys.focusedEntity &&
        widgetSys.focusedEntity === this._entity
      ) {
        this._highlighting = true;
      } else {
        this._highlighting = false;
      }

      this._updateState();
    };

    this._onMouseDown = (e) => {
      if (this.enabled === false) {
        return;
      }

      let widgetSys = this._widget.system;
      if (e.button === 'left') {
        e.stop();

        if (widgetSys.focusedEntity !== this._entity) {
          return;
        }

        this._pressing = true;
        this._updateState();
        // handle only drag move
        if (!this._handle || e.target !== this._handle) {
          this._updateDrag(vec3.new(e.mouseX, e.mouseY, 0));
        }

        this._dragging = true;
      }
    };

    this._onMouseMove = (e) => {
      if (this.enabled === false) {
        return;
      }

      if (e.button === 0) {
        e.stop();

        if (this._dragging) {
          this._updateDrag(vec3.new(e.mouseX, e.mouseY, 0));
        }
      }
    };

    this._onMouseUp = (e) => {
      if (this.enabled === false) {
        return;
      }

      if (e.button === 'left') {
        e.stop();

        this._dragging = false;
        this._pressing = false;
        this._updateState();
      }
    };

    // touch events
    this._onTouchMove = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();
      if (e.id === this._fingerId) {
        if (this._dragging) {
          this._updateDrag(vec3.new(e.x, e.y, 0));
        }
      }
    };

    this._onTouchStart = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();
      if (this._fingerId !== -1) {
        return;
      }

      this._fingerId = e.id;
      this._pressing = true;
      this._updateState();
      if (!this._handle || e.target !== this._handle) {
        this._updateDrag(vec3.new(e.x, e.y, 0));
      }

      this._dragging = true;
    }

    this._onTouchEnd = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();
      if (e.id !== this._fingerId) {
        return;
      }

      this._dragging = false;
      this._fingerId = -1;
      this._pressing = false;
      this._updateState();
    };
  }

  onInit() {
    super.onInit();
    this._widget = this._entity.getComp('Widget');
    this._widget.focusable = true;

    this._bgImage = this._background && this._background.getComp('Image');
    if (!this._bgImage) {
      this._bgImage = this._entity.getComp('Image');
    }

    this._fillWidget = this._fill && this._fill.getComp('Widget');
    this._handleWidget = this._handle && this._handle.getComp('Widget');
    let relativeValue = 0.0;
    if (this._value > 0) {
      relativeValue = (this._value - this._calMinValue) / (this._calMaxValue - this._calMinValue);
      relativeValue = Math.round(relativeValue * 100) / 100;
    }

    this._normalizedValue = this._reverse ? 1 - relativeValue : relativeValue;
    this._updateVisuals();
  }

  onDestroy() {
    this._widget.focusable = false;
    super.onDestroy();
  }

  _updateState() {
    let state = 'normal';

    if (this._pressing) {
      state = 'pressed';
    } else if (this._highlighting) {
      state = 'highlight';
    }

    if (this._state === state) {
      return;
    }

    let oldState = this._state;
    this._state = state;

    this.dispatch('transition', {
      detail: {
        oldState,
        newState: this._state
      }
    });

    if (this._bgImage === null) {
      return;
    }

    if (this._transition === 'none') {
      return;
    }

    if (this._transition === 'color') {
      this._bgImage.color = this._transitionColors[state];
    } else if (this._transition === 'sprite') {
      this._bgImage.sprite = this._transitionSprites[state];
    } else {
      // todo: not implemented
      console.warn('Button transition animation is not implemented');
    }
  }

  _set(value) {
    let num = utils.clamp(value, this._calMinValue, this._calMaxValue);
    if (this._value != num) {
      this._value = num;
      this._updateVisuals();
      this._emitValueChangedEvents();
    }
  }

  _getReverseValue() {
    return this._maxValue < this._minValue;
  }

  _updateDrag(mousePos) {
    let widget = this._handle ? this._handleWidget : this._fillWidget;
    let containerWidget = widget._entity.parent.getComp('Widget');
    if (containerWidget) {
      let corner = [vec3.zero(), vec3.zero(), vec3.zero(), vec3.zero()];
      containerWidget.getWorldCorners(corner[0], corner[1], corner[2], corner[3]);
      let position = corner[1];
      let containerVec = vec3.zero(), offsetVec = vec3.zero();
      let width = 0.0, value = 0.0;
      if (this._direction === 'horizontal') {
        vec3.subtract(containerVec, corner[2], position);
        vec3.subtract(offsetVec, mousePos, position);
        width = vec3.distance(corner[2], position);
        this._normalizedValue = utils.clamp01(value / width);
      } else {
        vec3.subtract(containerVec, corner[0], position);
        vec3.subtract(offsetVec, mousePos, position);
        width = vec3.distance(corner[0], position);
      }
      value = vec3.dot(containerVec, offsetVec) / width;
      this._normalizedValue = utils.clamp01(value / width);
      this._clampValue();
    }
  }

  _updateVisuals() {
    let min = [0, 0];
    let max = [1, 1];
    let dirValue = this._direction === 'horizontal' ? 0 : 1;
    if (this._fillWidget) {
      let sprite = this._fill.getComp('Image');
      // NOTE:need to verify
      if (sprite) {
        if (sprite.type === 'filled') {
          sprite.filledStart = this._normalizedValue;
        } else if (this._reverse) {
          min[dirValue] = this._normalizedValue;
        } else {
          max[dirValue] = this._normalizedValue;
        }
      }

      this._fillWidget.setAnchors(min[0], min[1], max[0], max[1]);
    }

    if (this._handleWidget) {
      min = [0, 0];
      max = [1, 1];
      min[dirValue] = this._normalizedValue;
      max[dirValue] = this._normalizedValue;
      this._handleWidget.setAnchors(min[0], min[1], max[0], max[1]);
    }
  }

  _clampValue() {
    this.value = (this._reverse ? (1 - this._normalizedValue) : this._normalizedValue) * (this._calMaxValue - this._calMinValue);
  }

  _getCalculateWidget() {
    return this._handle.parent.getComp('Widget');
  }

  _onFocus() {
    if (this.enabled === false) {
      return;
    }

    this._highlighting = true;
    this._updateState();
  }

  _onBlur() {
    if (this.enabled === false) {
      return;
    }

    this._fingerId = -1;
    this._highlighting = false;
    this._updateState();
  }

  _onTouchEnter(e) {
    if (this.enabled === false) {
      return;
    }

    if (this._fingerId !== -1 && this._fingerId === e.id) {
      e.stop();
      this._pressing = true;
      this._updateState();
    }
  }

  _onTouchLeave(e) {
    if (this.enabled === false) {
      return;
    }

    if (this._fingerId !== -1 && this._fingerId === e.id) {
      e.stop();
      this._pressing = false;
      this._updateState();
    }
  }

  _emitValueChangedEvents() {
    this.dispatch('Slider.onValueChanged');
  }
}

SliderComponent.events = {
  'mouseenter': '_onMouseEnter',
  'mouseleave': '_onMouseLeave',
  'mousemove': '_onMouseMove',
  'mousedown': '_onMouseDown',
  'mouseup': '_onMouseUp',
  'focus': '_onFocus',
  'blur': '_onBlur',
  'touchenter': '_onTouchEnter',
  'touchleave': '_onTouchLeave',
  'touchstart': '_onTouchStart',
  'touchmove': '_onTouchMove',
  'touchend': '_onTouchEnd'
};

SliderComponent.schema = {
  handle: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._handle === val) {
        return;
      }

      this._handle = val;
      if (this._handle) {
        this._handleWidget = this._handle.getComp('Widget');
      }

      this._updateVisuals();
    }
  },

  fill: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._fill === val) {
        return;
      }

      this._fill = val;
      if (this._fill) {
        this._fillWidget = this._fill.getComp('Widget');
      }

      this._updateVisuals();
    }
  },

  direction: {
    type: 'enums',
    default: 'horizontal',
    options: ['horizontal', 'vertical'],
    set(val) {
      if (this._direction === val) {
        return;
      }

      this._direction = val;
      this._lastAxis = this._direction;
    }
  },

  minValue: {
    type: 'number',
    default: 0.0,
    set(val) {
      if (this._minValue === val) {
        return;
      }

      this._minValue = val;
      this._calMinValue = val;
      if (this._minValue > this._maxValue) {
        this._calMinValue = this._maxValue;
        this._calMaxValue = this._minValue;
      }
    }
  },

  maxValue: {
    type: 'number',
    default: 1.0,
    set(val) {
      if (this._maxValue === val) {
        return;
      }

      this._maxValue = val;
      this._calMaxValue = val;
      if (this._minValue > this._maxValue) {
        this._calMinValue = this._maxValue;
        this._calMaxValue = this._minValue;
      }
    }
  },

  value: {
    type: 'number',
    default: 0.0,
    set(val) {
      if (this._value === val) {
        return;
      }

      this._set(val, false);
    }
  },

  transitionColors: {
    type: 'object',
    default: {
      normal: color4.create(),
      highlight: color4.create(),
      pressed: color4.create(),
      disabled: color4.create(),
    }
  },

  transitionSprites: {
    type: 'object',
    parse(app, value, propInfo, entities) {
      if (value) {
        let cPropInfo = { normal: null, highlight: null, pressed: null, disabled: null };
        if (value.normal && typeof value.normal === 'string') {
          cPropInfo.normal = app.assets.get(value.normal);
        }

        if (value.highlight && typeof value.highlight === 'string') {
          cPropInfo.highlight = app.assets.get(value.highlight);
        }

        if (value.pressed && typeof value.pressed === 'string') {
          cPropInfo.pressed = app.assets.get(value.pressed);
        }

        if (value.disabled && typeof value.disabled === 'string') {
          cPropInfo.disabled = app.assets.get(value.disabled);
        }

        return cPropInfo;
      }
    },
    default: {
      normal: null,
      highlight: null,
      pressed: null,
      disabled: null
    }
  },

  background: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._background === val) {
        return;
      }

      this._background = val;
      if (this._background) {
        this._bgImage = this._background.getComp('Image');
      }
    }
  },

  transition: {
    type: 'enums',
    default: 'none',
    options: ['none', 'color', 'sprite'],
  },
};
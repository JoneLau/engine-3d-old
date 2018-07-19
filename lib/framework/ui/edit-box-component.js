import UIElementComponent from './ui-element-component';
import { color4, vec3 } from '../../vmath';
import { Entity } from '../../ecs';
import { INT_MAX } from '../../vmath/bits';

export default class EditBoxComponent extends  UIElementComponent{
  constructor() {
    super();
    /**
     * Transform the type when the state changes.
     * @type {string}
     */
    this._state = 'none';

    /**
     * Highlight state
     * @type {boolean}
     */
    this._highlighting = false;

    /**
     * Pressing state
     * @type {boolean}
     */
    this._pressing = false;

    /**
     * The widget component of the current entity
     * @type {Widget}
     */
    this._widget = null;

    /**
     * Image components that need to control state changes
     * @type {Image}
     */
    this._bgImage = null;

    /**
     * The text component controlled by the current component
     * @type {Text}
     */
    this._textComp = null;

    /**
     * The input or textarea type is determined by the type
     * @type {Object}
     */
    this._activeDom = null;

    /**
     * Current input text
     * @type {string}
     */
    this._inputText = '';

    /**
     * Is it currently in edit mode
     * @type {boolean}
     */
    this._editMode = false;

    /**
     * @param {MouseEvent} e - monitor mouse move events
     */
    this._onMouseMove = e => {
      if (this._pressing) {
        this._flushDom();
      }
    };

    /**
     * @param {MouseEvent} e - monitor mouse entry events
     */
    this._onMouseEnter = e => {
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

    /**
     * @param {MouseEvent} e - monitor mouse leave events
     */
    this._onMouseLeave = e => {
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

    /**
     * @param {MouseEvent} e - monitor mouse down events
     */
    this._onMouseDown = e => {
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
      }
    };

    /**
     * @param {MouseEvent} e - monitor mouse up events
     */
    this._onMouseUp = e => {
      if (this.enabled === false) {
        return;
      }

      if (e.button === 'left') {
        e.stop();

        this._pressing = false;
        this._updateState();
        this._onClk();
      }
    };

    /**
     * Receiving text changes the event
     */
    this._onInput = () => {
      this._text = this._activeDom.value;
      this._emitValueChangedEvents();
    };

    /**
     * @param {Object} e - Keyboard events
     */
    this._onReturnKey = (e) => {
      if (this._textComp === null) {
        return;
      }

      if (e.keyCode === 13) {
        if (this._returnKeyType === 'new-line') {
          if (this._lineType === 'multi-line') {
            this._text += '\n';
          }
        } else {
          this._endInput();
          if (this._returnKeyType === 'submit') {
            this._emitSubmitEvents();
          }
        }
      }
    };

    /**
     * @param {TouchEvent} e - monitor touch end events
     */
    this._onTouchEnd = (e)=> {
      if (this.enabled === false) {
        return;
      }

      e.stop();

      this._pressing = false;
      this._updateState();

      this._onClk();
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

    if (this._maxLength <= 0) {
      this._maxLength = INT_MAX;
    }

    this._textComp = this._textEnt && this._textEnt.getComp('Text');
    if (this._textComp) {
      let textAlign = this._textComp.align;
      let a = textAlign.split('-');
      if (a.indexOf('middle') === -1) {
        this._textComp.align = 'middle-' + a[1];
      }
    }

    this._dealText(this._text);
    if (this._lineType === 'multi-line') {
      this._createDom('textarea');
    } else {
      this._createDom('input');
    }

    this._activeDom.maxLength = this._maxLength;
  }

  onDisable() {
    this._endInput();
  }

  onDestroy() {
    this._widget.focusable = false;
    this._endInput();
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

  _registerEvent() {
    this._activeDom.addEventListener('input', this._onInput);
    this._activeDom.addEventListener('keypress', this._onReturnKey);
  }

  _unregisterEvent() {
    this._activeDom.removeEventListener('input', this._onInput);
    this._activeDom.removeEventListener('keypress', this._onReturnKey);
  }

  /**
   * Activate the dom when clicked
   */
  _onClk() {
    if (this._textComp === null) {
      return;
    }

    if (!this._editMode) {
      this._editMode = true;
      this._activeDom.style.display = 'block';
      this._activeDom.value = this._text;
      this._textComp.enabled = false;
      // TODO:settimeout to auto active keyboard failed,need to active manual operation
      this._startFocus();
      this._emitEditingBeginEvents();
    }
  }

  _startFocus() {
    this._activeDom.focus();
    this._flushDom();
  }

  /**
   * @param {string} val - the text specification
   */
  _dealText(val) {
    if (this._textComp === null) {
      return;
    }

    this._text = '';
    if (this._lineType === 'single-line') {
      val = val.replace('\n', '');
    }

    let num = Math.min(val.length, this._maxLength);
    for (let i = 0; i < num; ++i) {
      let result = this._checkChar(val[i], this._text.length, this._text);
      if (result.length > 0) {
        this._text += result;
      }
    }

    this._switchTextState();
    let text = this._text;
    if (this._contentType === 'password') {
      text = this._text.replace(new RegExp('.+?', 'g'), 'V');
    }

    this._textComp.text = text.length > 0 ? text : this.defaultText;
  }

  /**
   * @todo use placeHolder
   */
  _switchTextState() {
    // the prompt is translucent when there is no text.
    let textCompColor = this._textComp.color;
    if (this._text.length <= 0) {
      this._textComp.color = color4.new(textCompColor.r, textCompColor.g, textCompColor.b, 0.5);
    } else {
      this._textComp.color = color4.new(textCompColor.r, textCompColor.g, textCompColor.b, 1);
    }
  }

  /**
   * Normalize characters in current mode
   * @param {string} c - check string
   * @param {number} index - index in a string
   * @param {string} text - the current text
   * @returns {string} -- returns the normalized character
   */
  _checkChar(c, index, text) {
    let isMatch = false;

    if (this._contentType === 'standard') {
      return c;
    }

    if (this._contentType === 'int-number' || this._contentType === 'decimal-number') {
      isMatch = new RegExp('[0-9]').test(c);
      if (isMatch) {
        return c;
      }

      if (c === '-') {
        if (index === 0) {
          return c;
        }
      }

      if (c === '.' && this._contentType === 'decimal-number' && this._text.indexOf('.') < 0) {
        return c;
      }
    } else if (this._contentType === 'alpha-number') {
      isMatch = new RegExp('[0-9a-zA-Z]').test(c);
      if (isMatch) {
        return c;
      }
    } else if (this._contentType === 'caps-all') {
      return c.toUpperCase();
    } else if (this._contentType === 'name') {
      isMatch = new RegExp('[a-zA-Z]').test(c);
      if (isMatch) {
        isMatch = new RegExp('[a-z]').test(c);
        if (isMatch) {
          if (index === 0 || text[index - 1] === ' ') {
            return c.toUpperCase();
          }
        } else {
          if (index > 0 && text[index - 1] !== ' ') {
            return c.toLowerCase();
          }
        }
        return c;
      } else {
        if (c === ' ' && index > 0) {
          if (text[index - 1] !== ' ') {
            return c;
          }
        }
      }
    } else if (this._contentType === 'email') {
      isMatch = new RegExp('[0-9a-zA-Z]').test(c);
      if (isMatch) {
        return c;
      }

      if (c === '@' && this._text.indexOf('@') === -1) {
        return c;
      }

      let str = '!#$%&\'*+-/=?^_`{}|~';
      if (str.indexOf(c) !== -1) {
        return c;
      }

      if (c === '.') {
        if (index > 0 && text[index - 1] !== '.') {
          return c;
        }
      }
    } else {
      return c;
    }

    return '';
  }

  _endInput() {
    if (this._textComp === null) {
      return;
    }

    if (this._editMode) {
      this._editMode = false;
      this._activeDom.style.display = 'none';
      this._dealText(this._text);
      this._textComp.enabled = true;
      if (this._text.length <= 0) {
        this._textComp.text = this.defaultText;
      }
      this._switchTextState();
      this._activeDom.blur();
      this._emitEditingEndEvents();
    }
  }

  /**
   * @param {string} type - dom type,input or texture
   */
  _createDom(type) {
    if (this._activeDom) {
      this._unregisterEvent();
      document.body.removeChild(this._activeDom);
    }

    this._activeDom = document.createElement(type);
    document.body.appendChild(this._activeDom);
    if (this._activeDom.type !== 'textarea') {
      this._activeDom.type = this._contentType === 'password' ? 'password' : 'text';
    }
    this._activeDom.style.background = 'transparent';
    this._activeDom.style.position = 'absolute';
    this._activeDom.style.padding = '2px';
    this._activeDom.style.fontSize = this._textComp !== null ? this._textComp.fontSize + 'px' : '10px';
    this._activeDom.style.display = 'none';
    if (this._activeDom.type === 'textarea') {
      this._activeDom.style.active = 0;
      this._activeDom.style.overflowY = 'scroll';
      this._activeDom.style.resize = 'none';
    }

    this._activeDom.maxLength = this._maxLength;
    this._registerEvent();
  }

  /**
   * Flush dom when show
   */
  _flushDom() {
    if (this._textComp === null || this._activeDom.style.display === 'none') {
      return;
    }

    let canvas = this._app._canvas;
    let widget = this._textComp.entity.getComp('Widget');
    let corner = [vec3.zero(), vec3.zero(), vec3.zero(), vec3.zero()];
    widget.getWorldCorners(corner[0], corner[1], corner[2], corner[3]);
    let padding = 4;
    let left = corner[0].x + padding;
    let top = canvas.height - corner[0].y + padding;
    let align = this._textComp.align;
    this._activeDom.type === 'textarea' ? 'textarea' : 'input';
    align = align.indexOf('left') !== -1 ? 'left' : align.indexOf('center') !== -1 ? 'center' : 'right';
    this._activeDom.style.textAlign = align;
    this._activeDom.style.outline = 'none';
    this._activeDom.style.border = '0px';
    this._activeDom.maxLength = this._maxLength;
    this._activeDom.style.width = (widget._rect.w - padding - 2) + 'px';
    this._activeDom.style.height = (widget._rect.h - padding - 2) + 'px';
    this._activeDom.style.top = top + 'px';
    this._activeDom.style.left = left + 'px';
  }

  _onFocus() {
    if (this.enabled === false) {
      return;
    }

    this._highlighting = true;
    this._updateState();
  }

  _onBlur() {
    if (this._entity.enabledInHierarchy === false) {
      return;
    }

    this._fingerId = -1;
    this._highlighting = false;
    this._updateState();
    this._endInput();
  }

  /**
   * @param {TouchEvent} e - monitor touch entry events
   */
  _onTouchEnter(e) {
    if (this.enabled === false) {
      return;
    }

    if (this._fingerId === e.id) {
      e.stop();
      this._pressing = true;
      this._updateState();
    }
  }

  /**
   * @param {TouchEvent} e - monitor touch leave events
   */
  _onTouchLeave(e) {
    if (this.enabled === false) {
      return;
    }

    e.stop();
    this._pressing = false;
    this._updateState();
  }

  /**
   * @param {TouchEvent} e - monitor touch start events
   */
  _onTouchStart(e) {
    if (this.enabled === false) {
      return;
    }

    e.stop();

    this._fingerId = e.id;
    this._pressing = true;
    this._updateState();
  }

  /**
   * Dispatch start editing events
   */
  _emitEditingBeginEvents() {
    this.dispatch('EditBox.onEditingBegan');
  }

  /**
   * Dispatch end editing events
   */
  _emitEditingEndEvents() {
    this.dispatch('EditBox.onEditingEnd');
  }

  /**
   * Dispatch value changes events
   */
  _emitValueChangedEvents() {
    this.dispatch('EditBox.onValueChanged');
  }

  /**
   * Dispatch submit events
   */
  _emitSubmitEvents() {
    this.dispatch('EditBox.onSubmit');
  }
}

EditBoxComponent.events = {
  'mouseenter': '_onMouseEnter',
  'mouseleave': '_onMouseLeave',
  'mousedown': '_onMouseDown',
  'mousemove': '_onMouseMove',
  'mouseup': '_onMouseUp',
  'focus': '_onFocus',
  'blur': '_onBlur',
  'touchenter': '_onTouchEnter',
  'touchleave': '_onTouchLeave',
  'touchstart': '_onTouchStart',
  'touchend': '_onTouchEnd'
};

EditBoxComponent.schema = {
  defaultText: {
    type: 'string',
    default: ''
  },

  textEnt: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._textEnt === val) {
        return;
      }

      this._textEnt = val;
      if (!this._textEnt) {
        console.warn('Text component cannot be null');
      }

      if (this._textEnt) {
        this._textComp = this._textEnt.getComp('Text');
        if (this._textComp) {
          this._activeDom.style.fontSize = this._textComp.fontSize + 'px';
          this._textComp.text = this._defaultText;
          let textAlign = this._textComp.align;
          let a = textAlign.split('-');
          if (a.indexOf('middle') === -1) {
            this._textComp.align = 'middle-' + a[1];
          }
        }
        this._switchTextState();
      }
    }
  },

  text: {
    type: 'string',
    default: '',
    set(val) {
      val = !val ? '' : val;
      if (this._text === val) {
        return;
      }

      this._dealText(val);
    }
  },

  contentType: {
    type: 'enums',
    default: 'standard',
    options: ['standard', 'int-number', 'decimal-number', 'alpha-number', 'caps-all', 'name', 'email', 'password'],
    set(val) {
      if (this._contentType === val) {
        return;
      }

      this._contentType = val;
      if (this._contentType === 'password') {
        this._activeDom.type = 'password';
        this.lineType = 'single-line';
      } else if (this._contentType === 'email') {
        this._activeDom.type = 'email';
        this.lineType = 'single-line';
      } else {
        this._activeDom.type = 'text';
        this.lineType = this._lineType;
      }

      this._dealText(this._text);
    }
  },

  lineType: {
    type: 'enums',
    default: 'single-line',
    options: ['single-line', 'multi-line'],
    set(val) {
      if (this._lineType === val) {
        return;
      }

      if (this._contentType === 'standard') {
        this._lineType = val;
      } else {
        this._lineType = 'single-line';
      }

      if (this._lineType === 'multi-line') {
        this._createDom('textarea');
      } else {
        this._createDom('input');
      }
    }
  },

  returnKeyType: {
    type: 'enums',
    default: 'none',
    options: ['none', 'submit', 'new-line']
  },

  maxLength: {
    type: 'int',
    default: INT_MAX,
    set(val) {
      if (this._maxLength === val) {
        return;
      }

      this._maxLength = val;
      if (this._maxLength <= 0) {
        this._maxLength = INT_MAX;
      }

      this._activeDom.maxLength = this._maxLength;
      this._dealText(this._text);
    }
  },

  transitionColors: {
    type: 'object',
    default: {
      normal: color4.create(),
      highlight: color4.create(),
      pressed: color4.create(),
      disabled: color4.create(),
    },
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
    },
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
    set(val) {
      if (this._transition !== val) {
        this._transition = val;
      }
    },
  },
};
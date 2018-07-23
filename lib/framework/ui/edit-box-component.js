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
     * Current text component
     * @type {Text}
     */
    this._textComp = null;

    /**
     * Current placeHolder text component
     * @type {Text}
     */
    this._placeHolderComp = null;

    /**
     * The dom currently in use
     */
    this._activeDom = null;

    /**
     * Save text information in the input state
     */
    this._inputText = '';

    /**
     * Save placeHolder infomation
     */
    this._placeHolderStr = '';

    // mouse events
    this._onMouseMove = e => {

    };

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
      }
    };

    this._onMouseUp = (e) => {
      if (this.enabled === false) {
        return;
      }

      if (e.button === 'left') {
        e.stop();

        this._pressing = false;
        this._updateState();
        this._show();
      }
    };

    // touch events
    this._onTouchEnd = (e)=> {
      if (this.enabled === false) {
        return;
      }

      e.stop();

      this._pressing = false;
      this._updateState();
      this._show();
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

    this._textComp = this._textEnt && this._textEnt.getComp('Text');
    this._placeHolderComp = this._placeHolder && this._placeHolder.getComp('Text');
    if (this._placeHolderComp) {
      this._placeHolderStr = this._placeHolderComp.text;
    }

    if (this._maxLength <= 0) {
      this._maxLength = INT_MAX;
    }

    this._createDom(this._lineType === 'single-line' ? 'input' : 'textarea');
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

  /**
   * Create dom element
   * @param {string} type - dom type
   * @todo use matrices to support rotation and scaling of dom elements
   */
  _createDom(type) {
    this._removeDom();

    this._activeDom = document.createElement(type === 'input' ? 'input' : 'textarea');
    let view = document.getElementById('view');
    view.appendChild(this._activeDom);
    this._activeDom.className = 'cocos3DEditBox';
    if (type === 'input') {
      this._activeDom.type = 'text';
    }

    let style = this._activeDom.style;
    style.fontSize = this._fontSize + 'px';
    style.color = '#000000';
    style.border = '1px';
    style.background = 'transparent';
    style.width = '100%';
    style.height = '100%';
    style.outline = 'medium';
    style.padding = '0';
    // uppercase lowercase capitalize
    style.textTransform = 'none';
    style.display = 'none';
    style.position = 'absolute';
    style.left = '0px';
    style.bottom = '0px';
    if (type === 'textarea') {
      style.overflowY = 'scroll';
      style.resize = 'none';
    }

    this._activeDom.maxLength = this._maxLength;

    this._activeDom.addEventListener('input', () => {
      this._inputText = this._activeDom.value;
      this._emitValueChangedEvents();
    });

    this._activeDom.addEventListener('keypress', (e) => {
      // keyboard enter
      if (e.keyCode === 13) {
        if (this._returnKeyType === 'new-line' && this._lineType === 'multi-line') {
          this._text += '\n';
        } else {
          if (this._returnKeyType === 'submit') {
            this._emitSubmitEvents();
          }

          this._activeDom.blur();
        }
      }
    });

    this._activeDom.addEventListener('focus', () => {
      this._emitEditingBeginEvents();
    });

    this._activeDom.addEventListener('blur', () => {
      if (this._text !== this._inputText) {
        this._dealText(this._inputText);
      }

      this._hidden();
      this._emitEditingEndEvents();
    });
  }

  /**
   * Remove dom element
   */
  _removeDom() {
    if (this._activeDom === null) {
      return;
    }

    let view = document.getElementById('view');
    if (view.contains(this._activeDom)) {
      view.removeChild(this._activeDom);
    }

    this._activeDom = null;
  }

  /**
   * Process the current input text
   * @param {string} val - current input text
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
      let canAdd = !!result;
      if (canAdd) {
        this._text += result;
      }
    }

    this._inputText = this._text;
    if (this._contentType === 'password') {
      this._text = this._text.replace(new RegExp('.+?', 'g'), '*');
    }

    this._switchState(this._text);
  }

  /**
   * Processing text chars according to the selected inputMode
   * @param {string} c - char that need to be processed
   * @param {number} index - char index
   * @param {string} text - all chars currently processed
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

  /**
   * Show the dom when clicked
   */
  _show() {
    if (this._activeDom === null) {
      return;
    }

    let widget = this._textComp.entity.getComp('Widget');
    let corner = [vec3.zero(), vec3.zero(), vec3.zero(), vec3.zero()];
    widget.getWorldCorners(corner[0], corner[1], corner[2], corner[3]);
    this._activeDom.style.width = widget._rect.w + 'px';
    this._activeDom.style.height = widget._rect.h + 'px';
    this._activeDom.style.display = '';
    this._activeDom.style.bottom = corner[1].y + 'px';
    this._activeDom.style.left = corner[1].x + 'px';
    this._activeDom.focus();
    this._activeDom.value = this._text;
    this._textComp.text = '';
    let index = this._textComp.align.indexOf('middle');
    if (index === -1) {
      let sp = this._textComp.align.split('-');
      this._textComp.align = 'middle-' + sp[1];
    }

    if (this._placeHolderComp) {
      this._placeHolderComp.text = '';
      index = this._placeHolderComp.align.indexOf('middle');
      if (index === -1) {
        let sp = this._placeHolderComp.align.split('-');
        this._placeHolderComp.align = 'middle-' + sp[1];
      }
    }
  }

  /**
   * Hiding dom elements
   */
  _hidden() {
    this._activeDom.style.display = 'none';
    this._switchState(this._text);
  }

  /**
   * @param {string} str
   */
  _switchState(str) {
    this._textComp.text = str;
    if (this._placeHolderComp) {
      this._placeHolderComp.text = this._text.length <= 0 ? this._placeHolderStr : '';
    }
  }

  /**
   * Dom type changes when the contentType changes
   */
  _contentTypeChanged() {
    this._activeDom.style.textTransform = 'none';
    if (this._contentType === 'int-number' || this._contentType === 'decimal-number') {
      this._activeDom.type = 'number';
    } else if (this._contentType === 'email') {
      this._activeDom.type == 'email';
    } else if (this._contentType === 'password') {
      this._activeDom.type = 'password';
    } else if (this._contentType === 'name') {
      this._activeDom.style.textTransform = 'capitalize';
    } else if (this._contentType === 'caps-all') {
      this._activeDom.style.textTransform = 'uppercase';
    } else {
      this._activeDom.type = 'text';
    }
  }

  /**
   * Dom type changes when the lineType changes
   */
  _lineTypeChanged() {
    this._createDom(this._lineType === 'single-line' ? 'input' : 'textarea');
  }

  /**
   * Change the default placeholder content
   * @param {string} str - new placeHolder
   */
  changedPlaceHolder(str) {
    if (this._placeHolderStr === str) {
      return;
    }

    this._placeHolderStr = str;
    if (this._text.length <= 0) {
      if (this._placeHolderComp) {
        this._placeHolderComp.text = this._placeHolderStr;
      }
    }
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
  }

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

  _onTouchLeave(e) {
    if (this.enabled === false) {
      return;
    }

    e.stop();
    this._pressing = false;
    this._updateState();
  }

  _onTouchStart(e) {
    if (this.enabled === false) {
      return;
    }

    e.stop();

    this._fingerId = e.id;
    this._pressing = true;
    this._updateState();
  }

  _emitEditingBeginEvents() {
    this.dispatch('EditBox.onEditingBegin');
  }

  _emitEditingEndEvents() {
    this.dispatch('EditBox.onEditingEnd');
  }

  _emitValueChangedEvents() {
    this.dispatch('EditBox.onValueChanged');
  }

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

      }
    }
  },

  placeHolder: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._placeHolder === val) {
        return;
      }

      this._placeHolder = val;
      if (this._placeHolder) {
        this._placeHolderComp = this._placeHolder.getComp('Text');
        if (this._placeHolderComp) {
          this._placeHolderStr = this._placeHolderComp.text;
        }
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
      this._contentTypeChanged();
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

      this._lineType = val;
      this._lineTypeChanged();
    }
  },

  returnKeyType: {
    type: 'enums',
    default: 'none',
    options: ['none', 'submit', 'new-line']
  },

  maxLength: {
    type: 'number',
    default: INT_MAX,
    set(val) {
      if (this._maxLength === val) {
        return;
      }

      this._maxLength = val;
      if (this._maxLength <= 0) {
        this._maxLength = INT_MAX;
      }
    }
  },

  fontSize: {
    type: 'string',
    default: '29',
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
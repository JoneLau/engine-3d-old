import UIElementComponent from './ui-element-component';
import { color4 } from '../../vmath';
import { Entity } from '../../ecs';

/**
 * @extends {UIElementComponent}
 * @access public
 */
export default class ToggleComponent extends UIElementComponent {
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
     * Manages all the toggle components under it
     * @type {ToggleGroup}
     */
    this._toggleGroupComp = null;

    /**
     * Image component of the currently controlled checker
     * @type {Image}
     */
    this._checkerImage = null;

    /**
     * First finger id
     * @type {number}
     */
    this._fingerId = -1;
  }

  onInit() {
    super.onInit();
    this._widget = this._entity.getComp('Widget');
    this._widget.focusable = true;
    this._bgImage = this._background && this._background.getComp('Image');
    if (!this._bgImage) {
      this._bgImage = this._entity.getComp('Image');
    }

    this._toggleGroupComp = this._toggleGroup && this._toggleGroup.getComp('ToggleGroup');
    if (this._toggleGroupComp) {
      this._toggleGroupComp._addItem(this);
    }

    this._checkerImage = this._checker && this._checker.getComp('Image');
    if (this._checkerImage) {
      this._checkerImage.enabled = this._checked;
    }
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
   * @param {MouseEvent} e - monitor mouse entry events
   */
  _onMouseEnter(e) {
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
  }

  /**
   * @param {MouseEvent} e - monitor mouse leave events
   */
  _onMouseLeave(e) {
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
  }

  /**
   * @param {MouseEvent} e - monitor mouse down events
   */
  _onMouseDown(e) {
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
  }

  /**
   * @param {MouseEvent} e - monitor mouse up events
   */
  _onMouseUp(e) {
    if (this.enabled === false) {
      return;
    }

    let widgetSys = this._widget.system;
    if (e.button === 'left') {
      e.stop();

      if (widgetSys.focusedEntity !== this._entity) {
        return;
      }

      this.checked = !this.checked;
      this.dispatch('change');
      if (this._toggleGroupComp) {
        this._toggleGroupComp._updateCheck(this);
      }

      this._pressing = false;
      this._updateState();
    }
  }

  /**
   * Monitoring for focus events
   */
  _onFocus() {
    if (this.enabled === false) {
      return;
    }

    this._highlighting = true;
    this._updateState();
  }

  /**
   * Monitoring for blur events
   */
  _onBlur() {
    if (this.enabled === false) {
      return;
    }

    this._fingerId = -1;
    this._highlighting = false;
    this._updateState();
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
   * @param {TouchEvent} e - monitor touch end events
   */
  _onTouchEnd(e) {
    if (this.enabled === false) {
      return;
    }

    e.stop();

    this._fingerId = -1;
    this._pressing = false;
    this._updateState();

    this.checked = !this.checked;
    this.dispatch('change');
    if (this._toggleGroupComp) {
      this._toggleGroupComp._updateCheck(this);
    }
  }
}

ToggleComponent.events = {
  'mouseenter': '_onMouseEnter',
  'mouseleave': '_onMouseLeave',
  'mousedown': '_onMouseDown',
  'mouseup': '_onMouseUp',
  'focus': '_onFocus',
  'blur': '_onBlur',
  'touchenter': '_onTouchEnter',
  'touchleave': '_onTouchLeave',
  'touchstart': '_onTouchStart',
  'touchend': '_onTouchEnd'
};

ToggleComponent.schema = {
  checker: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._checker === val) {
        return;
      }

      this._checker = val;
      if (this._checker) {
        this._checkerImage = this._checker.getComp('Image');
        this._checkerImage.enabled = this._checked;
      }
    }
  },

  checked: {
    type: 'boolean',
    default: true,
    set(val) {
      if (this._checked === val) {
        return;
      }

      this._checked = val;
      if (this._checkerImage) {
        this._checkerImage.enabled = this._checked;
      }
    }
  },

  toggleGroup: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._toggleGroup === val) {
        return;
      }

      this._toggleGroup = val;
      if (this._toggleGroupComp) {
        this._toggleGroupComp._removeItem(this);
        this._toggleGroupComp = null;
      }

      if (this._toggleGroup) {
        this._toggleGroupComp = this._toggleGroup.getComp('ToggleGroup');
        if (this._toggleGroupComp) {
          this._toggleGroupComp._addItem(this);
        }
      }
    }
  },

  transitionColors: {
    type: 'object',
    default: {
      normal: color4.create(),
      highlight: color4.create(),
      pressed: color4.create(),
      disabled: color4.create()
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
    options: ['none', 'color', 'sprite']
  }
};

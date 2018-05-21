import UIElementComponent from "./ui-element-component";
import { vec2, vec3, mat4, color4 } from '../../vmath';

export default class DropDownComponent extends UIElementComponent {
  constructor() {
    super();
    this._state = 'none';
    // only support first finger
    this._fingerId = -1;
    this._highlighting = false;
    this._pressing = false;
    this._widget = null;
    this._itemList = [];
    this._lastToggle = null;

    this._onToggleValueChanged = (e) => {
      this.value = this._itemList.indexOf(e.component._entity);
      e.component._highlighting = false;
      e.component._updateState();

      if (this._lastToggle && e.component._entity === this._lastToggle._entity) {
        this._lastToggle.checked = true;
        return;
      }

      if (this._lastToggle) {
        this._lastToggle.checked = false;
        this._lastToggle = e.component;
        this._show();
        this.dispatch('change');
      }
    };
  }

  onInit() {
    this._entity.once('ready', () => {
      this._widget = this._entity.getComp('Widget');
      this._widget.focusable = true;

      this._flushShownData();
      if (!this._background) {
        this._background = this._entity.getComp('Image');
      }
    });
  }

  onDestroy() {
    this._widget.focusable = false;
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

    if (this._background === null) {
      return;
    }

    if (this._transition === 'none') {
      return;
    }

    if (this._transition === 'color') {
      this._background.color = this._transitionColors[state];
    } else if (this._transition === 'sprite') {
      this._background.sprite = this._transitionSprites[state];
    } else {
      // todo: not implemented
      console.warn('Button transition animation is not implemented');
    }
  }

  _flushShownData() {
    if (this._labComp) {
      this._labComp.text = this._value >= this._optionTexts.length ? '' : this._optionTexts[this._value];
    }

    if (this._imageComp) {
      this._imageComp.sprite = this._value >= this._optionSprites.length ? null : this._optionSprites[this._value];
    }
  }

  _show(isShow = true) {
    if (!this._template) {
      this._createTemplate();
    } else {
      if (this._template.enabled || !isShow) {
        this._template.enabled = false;
        return;
      }
    }

    this._template.enabled = true;
    let parentWidget = this._template.parent.getComp('Widget');
    let toggleWidget = this._itemList[0].getComp('Widget');
    let templateWidget = this._template.getComp('Widget');
    // set template
    let max = Math.max(this._optionSprites.length, this._optionTexts.length);
    if (templateWidget.anchorTop !== templateWidget.anchorBottom) {
      templateWidget.anchorTop = templateWidget.anchorBottom;
    }

    templateWidget.sizeY = max * toggleWidget._rect.h;
    templateWidget.offsetY = -parentWidget._rect.h * templateWidget.anchorTop - (1 - templateWidget.pivotY) * max * toggleWidget._rect.h;

    for (let i = 0; i < this._itemList.length; ++i) {
      let item = this._itemList[i];
      if (i >= max) {
        if (item.enabled) {
          item.enabled = false;
        }
      } else {
        if (item.enabled === false) {
          item.enabled = true;
        }

        for (let j = 0; j < item.children.length; ++j) {
          let labelComp = item.children[j].getComp('Text');
          if (labelComp) {
            labelComp.text = i >= this._optionTexts.length ? '' : this._optionTexts[i];
            break;
          }
        }

        let itemWidget = item.getComp('Widget');
        if (itemWidget.anchorTop !== itemWidget.anchorBottom) {
          itemWidget.anchorTop = itemWidget.anchorBottom;
        }

        itemWidget.offsetY = -itemWidget._rect.h * (1 - itemWidget.pivotY) - itemWidget._rect.h * i;
        let toggle = item.getComp('Toggle');
        if (i === this._value) {
          this._lastToggle = toggle;
          toggle.checked = true;
        } else {
          toggle.checked = false;
        }
      }
    }
  }

  _createTemplate() {
    let template = this._app.createEntity('template');
    template.setParent(this._entity);
    let tImg = template.addComp('Image');
    tImg.color = color4.new(0.9, 0.9, 0.9, 1);
    tImg.setAnchors(0, 0, 1, 0);
    tImg.setPivot(0.5, 1);
    tImg.setSize(0, 300);

    this._itemList = [];
    for (let i = 0; i < 10; ++i) {
      // TODO: clone this._item later
      let item = this._app.createEntity('item' + i);
      item.setParent(template);
      let itemWidget = item.addComp('Image');
      itemWidget.color = color4.new(0.5, 1, 1, 1);
      itemWidget.setAnchors(0, 1, 1, 1);
      itemWidget.setPivot(0.5, 1);
      itemWidget.setSize(0, 30)
      itemWidget.setOffset(0, -30 * i);

      let toggle = item.addComp('Toggle');
      toggle.background = itemWidget;
      toggle.transition = 'color';
      toggle.transitionColors.normal = color4.new(0.5, 1, 1, 1);
      toggle.transitionColors.highlight = color4.new(0.5, 1, 0, 1);
      toggle.transitionColors.pressed = color4.new(0.5, 0.5, 0.5, 1);
      toggle.transitionColors.disabled = color4.new(0.5, 0.2, 0.2, 1);
      toggle._updateState();

      let checkerBG = this._app.createEntity('toggleBg');
      checkerBG.setParent(item);
      let image = checkerBG.addComp('Image');
      image.setAnchors(0, 0, 0, 0);
      image.setSize(30, 30);
      image.setOffset(15,15);

      let checker = this._app.createEntity('checker');
      checker.setParent(checkerBG);
      let checkerImage = checker.addComp('Image');
      checkerImage._color = color4.new(1, 0, 0, 1);
      checkerImage.setAnchors(0, 0, 1, 1);
      checkerImage.setSize(-10, -10);

      let entLabel = this._app.createEntity('toggleLabel');
      entLabel.setParent(item);
      let text = entLabel.addComp('Text');
      text.setAnchors(0, 0, 0, 0);
      text.setSize(160, 30);
      text.setOffset(120, 15);
      text.text = 'Foobar';
      text.color = color4.new(0, 0, 0, 1);
      text.align = 'left-center';
      text.fontSize = this._labComp ? this._labComp.fontSize - 10 : 14;

      toggle.checker = checker;
      toggle._updateState();

      this._itemList.push(item);
      item.on('change', this._onToggleValueChanged);
    }

    this._template = template;
  }

  _onMouseEnter(e) {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
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

  _onMouseLeave(e) {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
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

  _onMouseDown(e) {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
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

  _onMouseUp(e) {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
      return;
    }

    if (e.button === 'left') {
      e.stop();

      this._pressing = false;
      this._updateState();
      this._show();
    }
  }

  _onFocus() {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
      return;
    }

    this._highlighting = true;
    this._updateState();
  }

  _onBlur() {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
      return;
    }

    this._fingerId = -1;
    this._highlighting = false;
    this._updateState();

    let widgetSys = this._widget.system;
    if (this._itemList.length > 0) {
      let index = this._itemList.indexOf(widgetSys.focusedEntity);
      if (index === -1) {
        this._show(false);
      }
    }
  }

  _onTouchEnter(e) {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
      return;
    }

    if (this._fingerId === e.id) {
      e.stop();
      this._pressing = true;
      this._updateState();
    }
  }

  _onTouchLeave(e) {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
      return;
    }

    e.stop();
    this._pressing = false;
    this._updateState();
  }

  _onTouchStart(e) {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
      return;
    }

    e.stop();

    this._fingerId = e.id;
    this._pressing = true;
    this._updateState();
  }

  _onTouchEnd(e) {
    if (this._enabled === false || this._entity.enabledInHierarchy === false) {
      return;
    }

    e.stop();

    this._fingerId = -1;
    this._pressing = false;
    this._updateState();
    this._show();
  }
}

DropDownComponent.events = {
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

DropDownComponent.schema = {
  value: {
    type: 'number',
    default: 0,
    set(val) {
      let max = Math.max(this._optionTexts.length, this._optionSprites.length);
      this._value = cc.math.clamp(val, 0, max - 1);
      this._flushShownData();
      this.dispatch('change');
    }
  },

  optionTexts: {
    type: 'object',
    default: ['option 1', 'option 2'],
    set(val) {
      this._optionTexts = val;
      if (this._optionTexts.length <= 0) {
        this._optionTexts = ['option 1', 'option 2']
      }

      this._flushShownData();
    }
  },

  optionSprites: {
    type: 'object',
    default: [null, null],
    set(val) {
      this._optionSprites = val;
      if (this._optionSprites.length <= 0) {
        this._optionSprites = [null, null];
      }

      this._flushShownData();
    }
  },

  labComp: {
    type: 'object',
    default: null,
    parse(app, value, propInfo, entities) {
      if (entities) {
        if (propInfo.type === 'object' && value) {
          let entIdx = value.indexOf('e');
          if (entIdx !== -1) {
            value = value.split('e').join('');
          }

          entIdx = parseInt(value);
          if (entities[entIdx]) {
            return entities[entIdx].getComp('Text');
          }
        }
      }

      return value;
    },
  },

  imageComp: {
    type: 'object',
    default: null,
    parse(app, value, propInfo, entities) {
      if (entities) {
        if (propInfo.type === 'object' && value) {
          let entIdx = value.indexOf('e');
          if (entIdx !== -1) {
            value = value.split('e').join('');
          }

          entIdx = parseInt(value);
          if (entities[entIdx]) {
            return entities[entIdx].getComp('Image');
          }
        }
      }

      return value;
    },
  },

  item: {
    type: 'object',
    default: null,
    parse(app, value, propInfo, entities) {
      if (entities) {
        if (propInfo.type === 'object' && value) {
          let entIdx = value.indexOf('e');
          if (entIdx !== -1) {
            value = value.split('e').join('');
          }

          entIdx = parseInt(value);
          if (entities[entIdx]) {
            return entities[entIdx];
          }
        }
      }

      return value;
    },
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
    default: {
      normal: null,
      highlight: null,
      pressed: null,
      disabled: null
    },
  },

  background: {
    type: 'object',
    default: null,
    parse(app, value, propInfo, entities) {
      if (entities) {
        if (propInfo.type === 'object' && value) {
          let entIdx = value.indexOf('e');
          if (entIdx !== -1) {
            value = value.split('e').join('');
          }

          entIdx = parseInt(value);
          if (entities[entIdx]) {
            return entities[entIdx].getComp('Image');
          }
        }
      }

      return value;
    },
  },

  transition: {
    type: 'enums',
    default: 'none',
    options: ['none', 'color', 'sprite'],
  }
}
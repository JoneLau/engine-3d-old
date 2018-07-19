import UIElementComponent from './ui-element-component';

/**
 * @extends {UIElementComponent}
 * @access public
 */
export default class ToggleGroupComponent extends UIElementComponent {
  constructor() {
    super();
    /**
     * Manage all the toggles
     * @type {number[]}
     */
    this._toggleItems = [];

    /**
     * Only one toggle is allowed to be activated
     * @type {Toggle}
     */
    this._activeItem = null;
  }

  /**
   * @param {Toggle} item - toggle that needs to be managed
   */
  _addItem(item) {
    if (this._toggleItems.indexOf(item) === -1) {
      this._toggleItems.push(item);
      if (this._activeItem === null) {
        if (item.checked) {
          this._activeItem = item;
        }
      } else {
        item.checked = false;
      }
    } else {
      console.warn('toggle item already added into toggle groups');
    }
  }

  /**
   * @param {Toggle} item - need to remove the managed toggle
   */
  _removeItem(item) {
    let pos = this._toggleItems.indexOf(item);
    if (pos === -1) {
      console.warn('toggle item not exists in toggle groups');
    } else {
      if (this._activeItem === item) {
        this._activeItem = null;
      }
      this._toggleItems.splice(pos, 1);
    }
  }

  /**
   * @param {Toggle} item - the toggle whose current state changes
   */
  _updateCheck(item) {
    let pos = this._toggleItems.indexOf(item);
    if (pos === -1) {
      console.warn('toggle item not exists in toggle groups');
      return true;
    } else {
      if (this._activeItem !== item) {
        if (this._activeItem) {
          this._activeItem.checked = false;
        }
        this._activeItem = item;
      } else {
        if (!this._allowSwitchOff) {
          if (this._activeItem && !this._activeItem.checked) {
            this._activeItem.checked = true;
          }
        }
      }
    }
  }
}

ToggleGroupComponent.schema = {
  allowSwitchOff: {
    type: 'boolean',
    default: false
  }
};

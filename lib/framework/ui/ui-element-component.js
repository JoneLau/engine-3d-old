import { Component } from '../../ecs';

/**
 * Base classes inherited by all UI components
 * @extends {Component}
 */
export default class UIElementComponent extends Component {

  onInit() {
    this._system.add(this);
  }

  onDestroy() {
    this._system.remove(this);
  }
}

import Bound from './bound-component';
import { vec2, vec3 } from '../../vmath';
import UIElementComponent from './ui-element-component';
import { Entity } from '../../ecs';
import { INT_MAX } from '../../vmath/bits';
import * as mathUtils from '../../vmath';

/**
 * @extends {UIElementComponent}
 */
export default class ScrollViewComponent extends UIElementComponent {
  constructor() {
    super();
    /**
     * The widget component of the current entity
     * @type {Widget}
     */
    this._widget = null;

    /**
     * View bound component
     * @type {Bound}
     */
    this._viewBound = null;

    /**
     * Content bound component
     * @type {Bound}
     */
    this._contentBound = null;

    /**
     * Content widget component
     * @type {Widget}
     */
    this._contentWidget = null;

    /**
     * View widget component
     * @type {Widget}
     */
    this._viewPortWidget = null;

    /**
     * Horizontal scrollbar component
     * @type {ScrollBar}
     */
    this._hScrollBarComp = null;

    /**
     * Vertical scrollbar component
     * @type {ScrollBar}
     */
    this._vScrollBarComp = null;

    /**
     * Drag and drop statue
     * @type {boolean}
     */
    this._dragging = false;

    /**
     * Move velocity
     * @type {vec2}
     */
    this._velocity = vec2.zero();

    /**
     * The current offset of content
     * @type {vec2}
     */
    this._startPos = vec2.zero();

    /**
     * The point under the current touch down
     * @type {vec2}
     */
    this._startPoint = vec2.zero();

    /**
     * First finger id
     * @type {number}
     */
    this._fingerId = -1;

    /**
     * Initialization layout
     * @type {boolean}
     */
    this._correctInited = false;

    /**
     * Record the last time content bound
     * @type {Component}
     */
    this._lastContentBound = null;

    /**
     * Record the last time view bound
     * @type {Component}
     */
    this._lastViewBound = null;

    /**
     * Record the last drag position
     * @type {Object}
     */
    this._lastPosition = vec2.zero();

    /**
     * @param {MouseEvent} e - monitor mouse down events
     */
    this._onMouseDown = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();
      this._dragging = true;
      this._startPos = vec2.new(this._contentWidget.offsetX, this._contentWidget.offsetY);
      this._startPoint = vec2.new(e.mouseX, e.mouseY);
    };

    /**
     * @param {MouseEvent} e - monitor mouse up events
     */
    this._onMouseUp = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();
      this._dragging = false;
    };

    /**
     * @param {MouseEvent} e - monitor mouse move event
     */
    this._onMouseMove = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();
      if (this._dragging) {
        this._onDrag(vec2.new(e.mouseX, e.mouseY));
      }
    };

    /**
     * @param {TouchEvent} e - monitor touch start events
     */
    this._onTouchStart = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();
      if (this._fingerId !== -1) {
        return;
      }

      this._fingerId = e.id;
      this._dragging = true;
      this._startPos = vec2.new(this._contentWidget.offsetX, this._contentWidget.offsetY);
      this._startPoint = vec2.new(e.x, e.y);
    };

    /**
     * @param {TouchEvent} e - monitor touch move events
     */
    this._onTouchMove = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();
      if (e.id === this._fingerId) {
        if (this._dragging) {
          this._onDrag(vec2.new(e.x, e.y));
        }
      }
    };

    /**
     * @param {TouchEvent} e - monitor touch end events
     */
    this._onTouchEnd = (e) => {
      if (this.enabled === false) {
        return;
      }

      e.stop();

      if (e.id !== this._fingerId) {
        return;
      }

      this._fingerId = -1;
      this._dragging = false;
    };

    this._updateScrollView = (e) => {
      if (e.component._dragging === false) {
        return;
      }

      this._updateBound();
      let calculateValue = e.component.reverse ? 1 - e.component.value : e.component.value;
      if (e.component.direction === 'horizontal') {
        let sizeDelta = this._contentBound.size.x - this._viewBound.size.x;
        let realMove = sizeDelta * calculateValue;
        let currentPos = this._viewBound.min.x - this._contentBound.min.x;
        this._contentWidget.offsetX += currentPos - realMove;
      } else {
        let sizeDelta = this._contentBound.size.y - this._viewBound.size.y;
        let realMove = sizeDelta * calculateValue;
        let currentPos = this._viewBound.min.y - this._contentBound.min.y;
        this._contentWidget.offsetY += currentPos - realMove;
      }

      this._updateBound();
    };
  }

  onInit() {
    super.onInit();
    this._widget = this._entity.getComp('Widget');
    this._viewPortWidget = this._viewPort && this._viewPort.getComp('Widget');
    this._contentWidget = this._content && this._content.getComp('Widget');

    if (this._vScrollBarComp) {
      this._vScrollBar.off('ScrollBar.onValueChanged', this._updateScrollView);
    }

    this._vScrollBarComp = this._vScrollBar && this._vScrollBar.getComp('ScrollBar');
    if (this._vScrollBarComp) {
      this._vScrollBar._reverse = true;
      this._vScrollBar.on('ScrollBar.onValueChanged', this._updateScrollView);
    }

    if (this._hScrollBarComp) {
      this._hScrollBar.off('ScrollBar.onValueChanged', this._updateScrollView);
    }

    this._hScrollBarComp = this._hScrollBar && this._hScrollBar.getComp('ScrollBar');
    if (this._hScrollBarComp) {
      this._hScrollBar.on('ScrollBar.onValueChanged', this._updateScrollView);
    }
  }

  onDestroy() {
    this._vScrollBar._entity.off('ScrollBar.onValueChanged', this._updateScrollView);
    this._hScrollBar._entity.off('ScrollBar.onValueChanged', this._updateScrollView);

    super.onDestroy();
  }

  tick() {
    // maybe let the editor do it
    if (this._viewPortWidget) {
      if (this._viewPortWidget.anchorLeft !== 0 ||
        this._viewPortWidget.anchorRight !== 1 ||
        this._viewPortWidget.anchorBottom !== 0 ||
        this._viewPortWidget.anchorTop !== 1
      ) {
        this._viewPortWidget.setAnchors(0, 0, 1, 1);
      }
    }

    if (this._correctInited === false) {
      this._correctVisual();
     }
  }

   /**
   * Adjust interface layout
   * @todo Maybe later let the editor handle it
   */
  _correctVisual() {
    this._getBound();
    if (
      this._viewBound && !vec3.equals(this._viewBound.size, vec3.zero()) &&
      this._contentBound && !vec3.equals(this._contentBound.size, vec3.zero())
    ) {
      this._correctInited = true;
      if (this._viewBound.size.x >= this._contentBound.size.x) {
        if (this._hScrollBar && this._hScrollBar.active) {
          this._hScrollBar.active = false;
        }

        if (this._viewPortWidget) {
          this._viewPortWidget.offsetY = 0;
          this._viewPortWidget.sizeY = 0;
        }
      } else {
        if (this._hScrollBar) {
          if (this._hScrollBar.active === false) {
            this._hScrollBar.active = true;
          }
          let hWidget = this._hScrollBar.getComp('Widget');
          if (this._viewPortWidget) {
            this._viewPortWidget.offsetY = hWidget._rect.h * (1 - this._viewPortWidget.pivotY);
            this._viewPortWidget.sizeY = -hWidget._rect.h;
          }
          hWidget.setAnchors(0, 0, 1, 0);
          if (this._vScrollBar) {
            if (this._vScrollBar.active) {
              let vWidget = this._vScrollBar.getComp('Widget');
              hWidget.sizeX = -vWidget._rect.w;
              hWidget.offsetX = -vWidget._rect.w * hWidget.pivotX;
            } else {
              hWidget.sizeX = 0;
              hWidget.offsetX = 0;
            }
          }
        }
      }

      if (this._viewBound.size.y >= this._contentBound.size.y) {
        if (this._vScrollBar && this._vScrollBar.active) {
          this._vScrollBar.active = false;
        }

        if (this._viewPortWidget) {
          this._viewPortWidget.offsetX = 0;
          this._viewPortWidget.sizeX = 0;
        }
      } else {
        if (this._vScrollBar) {
          if (this._vScrollBar.active === false) {
            this._vScrollBar.active = true;
          }

          let vWdiget = this._vScrollBar.getComp('Widget');
          if (this._viewPortWidget) {
            this._viewPortWidget.offsetX = -vWdiget._rect.w * this._viewPortWidget.pivotX;
            this._viewPortWidget.sizeX = -vWdiget._rect.w;
          }

          vWdiget.setAnchors(1, 0, 1, 1);
          if (this._hScrollBar) {
            if (this._hScrollBar.active) {
              let hWidget = this._hScrollBar.getComp('Widget');
              vWdiget.sizeY = -hWidget._rect.h;
              vWdiget.offsetY = hWidget._rect.h * (1 - vWdiget.pivotY);
            } else {
              vWdiget.sizeY = 0;
              vWdiget.offsetY = 0;
            }
          }
        }
      }
    }
  }

  postTick() {
    this._lateUpdate();
  }

  /**
   * Start dragging the content
   * @param {Object} mouse - current touch screen point position
   */
  _onDrag(mouse) {
    if (!this._contentWidget) {
      return;
    }

    this._updateBound();
    let delta = vec2.zero(), currentPos = vec2.zero();
    // get delta from calculate content offset to content offset
    vec2.subtract(delta, mouse, this._startPoint);
    vec2.add(currentPos, delta, this._startPos);
    vec2.subtract(delta, currentPos, vec2.new(this._contentWidget.offsetX, this._contentWidget.offsetY));
    let offset = this._calculateOffset(delta);
    vec2.add(currentPos, currentPos, offset);

    let contentOffset = [currentPos.x, currentPos.y];
    if (this._movementType == 'elastic') {
      let viewBoundSize = this._viewBound.size;
      // higher offset ，higher rubber
      if (offset.x !== 0) {
        contentOffset[0] -= (1.0 - 1.0 / (Math.abs(offset.x) * 0.5 / viewBoundSize.x + 1.0)) * viewBoundSize.x * this._sign(offset.x);
      }

      if (offset.y !== 0) {
        contentOffset[1] -= (1.0 - 1.0 / (Math.abs(offset.y) * 0.5 / viewBoundSize.y + 1.0)) * viewBoundSize.y * this._sign(offset.y);
      }
    }

    this._setContentOffset(vec2.new(contentOffset[0], contentOffset[1]));
  }

  /**
   * @param {number} value - any Numbers
   * @returns {number} - returns the numeric symbol
   */
  _sign(value) {
    if (value >= 0) {
      return 1;
    }
    return -1;
  }

  _getBound() {
    if (!this._contentWidget) {
      return new Bound(vec3.zero(), vec3.zero());
    }

    // get parent bound
    let pCorners = [vec3.zero(), vec3.zero(), vec3.zero(), vec3.zero()];
    this._viewPortWidget.getWorldCorners(pCorners[0], pCorners[1], pCorners[2], pCorners[3]);
    let center = vec3.zero();
    vec3.add(center, pCorners[0], pCorners[2]);
    vec3.divide(center, center, vec3.new(2, 2, 2));
    let viewRect = this._viewPortWidget._rect;
    this._viewBound = new Bound(center, vec3.new(viewRect.w, viewRect.h, 0));

    // get content bound
    let corners = [vec3.zero(), vec3.zero(), vec3.zero(), vec3.zero()];
    this._contentWidget.getWorldCorners(corners[0], corners[1], corners[2], corners[3]);

    let min = vec3.new(3.40E+38, 3.40E+38, 3.40E+38);
    let max = vec3.new(-3.40E+38, -3.40E+38, -3.40E+38);
    for (let i = 0; i < 4; i++) {
      vec3.min(min, min, corners[i]);
      vec3.max(max, max, corners[i]);
    }

    this._contentBound = new Bound(min, vec3.zero());
    this._contentBound.encapsulate(max);
  }

  /**
   * Adjustments make the content bound size smaller than the view bound size uniformly sized
   * @param {vec3} contentBoundSize - content bound size
   * @param {vec3} contentBoundCenter - contet bound center
   */
  _adjustBound(contentBoundSize, contentBoundCenter) {
    let size = [contentBoundSize.x, contentBoundSize.y];
    let center = [contentBoundCenter.x, contentBoundCenter.y];
    let offset = vec3.zero();
    vec3.subtract(offset, this._viewBound.size, this._contentBound.size);
    if (offset.x > 0) {
      center[0] -= offset.x * (this._contentWidget.pivotX - 0.5);
      size[0] = this._viewBound.size.x;
    }

    if (offset.y > 0) {
      center[1] -= offset.y * (this._contentWidget.pivotY - 0.5);
      size[1] = this._viewBound.size.y;
    }

    contentBoundSize = vec3.new(size[0], size[1], 0);
    contentBoundCenter = vec3.new(center[0], center[1], 0);
  }

  _updateBound() {
    this._getBound();
    if (!this._contentWidget) {
      return;
    }

    this._adjustBound(this._contentBound.size, this._contentBound.center);
    if (this._movementType === 'clamp') {
      let zero = [0, 0];
      if (this._viewBound.max.x > this._contentBound.max.y) {
        zero[0] = Math.min(this._viewBound.max.x - this._contentBound.max.x, this._viewBound.min.x - this._contentBound.min.x);
      } else if (this._viewBound.min.x < this._contentBound.min.x) {
        zero[0] = Math.max(this._viewBound.max.x - this._contentBound.max.x, this._viewBound.min.x - this._contentBound.min.x);
      }

      if (this._viewBound.max.y > this._contentBound.max.y) {
        zero[1] = Math.min(this._viewBound.max.y - this._contentBound.max.y, this._viewBound.min.y - this._contentBound.min.y);
      } else if (this._viewBound.min.y < this._contentBound.min.y) {
        zero[1] = Math.max(this._viewBound.max.y - this._contentBound.max.y, this._viewBound.min.y - this._contentBound.min.y);
      }

      if (!vec2.equals(vec2.new(zero[0], zero[1]), vec2.zero())) {
        let center = [];
        center[0] = this._contentWidget.offsetX + zero[0];
        center[1] = this._contentWidget.offsetY + zero[1];

        if (!this._horizontal) {
          center[0] = this._contentWidget.offsetX;
        }

        if (!this._vertical) {
          center[1] = this._contentWidget.offsetX;
        }

        this._setContentOffset(vec2.new(center[0], center[1]));
      }
    }
  }

   /**
   * Calculate the new drag boundary
   * @param {vec2} val - drag the distance
   */
  _calculateOffset(val) {
    let offset = [0, 0];
    if (this._movementType === 'unrestricted') {
      return vec2.zero();
    } else {
      let min = [this._contentBound.min.x, this._contentBound.min.y];
      let max = [this._contentBound.max.x, this._contentBound.max.y];
      if (this._horizontal) {
        min[0] += val.x;
        max[0] += val.x;
        if (min[0] > this._viewBound.min.x) {
          offset[0] = this._viewBound.min.x - min[0];
        } else if (max[0] < this._viewBound.max.x) {
          offset[0] = this._viewBound.max.x - max[0];
        }
      }

      if (this._vertical) {
        min[1] += val.y;
        max[1] += val.y;
        if (min[1] > this._viewBound.min.y) {
          offset[1] = this._viewBound.min.y - min[1];
        } else if (max[1] < this._viewBound.max.y) {
          offset[1] = this._viewBound.max.y - max[1];
        }
      }
    }

    return vec2.new(offset[0], offset[1]);
  }

  _lateUpdate() {
    if (!this._contentWidget) {
      return;
    }

    this._getBound();
    let outOffset = this._calculateOffset(vec2.zero());
    let isOut = !vec2.equals(outOffset, vec2.zero());
    let isAdd = !vec2.equals(this._velocity, vec2.zero());
    if (!this._dragging && (isOut || isAdd)) {
      let pos = [this._contentWidget.offsetX, this._contentWidget.offsetY];
      let offset = [outOffset.x, outOffset.y];
      let num = [this._velocity.x, this._velocity.y];
      for (let i = 0; i < 2; i++) {
        if (this._movementType === 'elastic' && offset[i] !== 0) {
          let backValue = this._smoothBack(pos[i], pos[i] + offset[i], num[i])
          pos[i] = backValue.value;
          num[i] = backValue.velocity;
          if (Math.abs(num[i]) < 1) {
            num[i] = 0;
          }
        } else if (this._inertia) {
          num[i] = num[i] * Math.pow(this._brake, this._app.deltaTime);
          if (Math.abs(num[i]) < 1) {
            num[i] = 0;
          }

          pos[i] += num[i] * this._app.deltaTime;
        } else {
          num[i] = 0;
        }
      }

      this._velocity = vec2.new(num[0], num[1]);
      if (!vec2.equals(this._velocity, vec2.zero())) {
        if (this._movementType === 'clamped') {
          let delta = vec2.zero();
          vec2.subtract(delta, vec2.new(pos[0], pos[1]), vec2.new(this._contentWidget.offsetX, this._contentWidget.offsetY));
          outOffset = this._calculateOffset(delta);
          pos[0] += outOffset.x;
          pos[1] += outOffset.y;
        }

        this._setContentOffset(vec2.new(pos[0], pos[1]));
      } else if (!vec2.equals(outOffset, vec2.zero())) {
        this._setContentOffset(vec2.new(pos[0] + outOffset.x, pos[1] + outOffset.y));
      }
    }

    let anchorOffset = vec2.new(this._contentWidget.offsetX, this._contentWidget.offsetY);
    if (this._dragging && this._inertia) {
      let b = vec2.zero();
      vec2.subtract(b, anchorOffset, this._lastPosition);
      vec2.divide(b, b, vec2.new(this._app.deltaTime, this._app.deltaTime));
      vec2.lerp(this._velocity, this._velocity, b, this._app.deltaTime * 10);
    }

    if ((this._lastPosition.x - anchorOffset.x) > 0.01 ||
      (this._lastPosition.y - anchorOffset.y) > 0.01 ||
      !this._isSameBound(this._viewBound, this._lastViewBound) ||
      !this._isSameBound(this._contentBound, this._lastContentBound)) {
      this._updateScrollBar();
      this._emitValueChangedEvents();
      this._updatePrevData();
    }
  }

  /**
   * Check that the two bound are equal
   * @param {Bound} a
   * @param {Bound} b
   */
  _isSameBound(a, b) {
    if (a && b) {
      if (!vec3.equals(a.center, b.center) || !vec3.equals(a.size, b.size)) {
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Smooth deceleration
   * @param {number} current - the current position
   * @param {number} target - try to reach the position
   * @param {vec2} currentVelocity - current velocity
   * @private
   * @ignore
   */
  _smoothBack(current, target, currentVelocity) {
    let deltaTime = this._app.deltaTime;
    this._elasticityDuration = Math.max(0.0001, this._elasticityDuration);
    let num = 2 / this._elasticityDuration;
    let num2 = num * deltaTime;
    let num3 = 1 / (1 + num2 + 0.48 * Math.pow(num2, 2) + 0.235 * Math.pow(num2, 3));
    let num4 = current - target;
    let num5 = target;
    let num6 = INT_MAX * this._elasticityDuration;
    num4 = mathUtils.clamp(num4, -num6, num6);
    target = current - num4;
    let num7 = (currentVelocity + num * num4) * deltaTime;
    currentVelocity = (currentVelocity - num * num7) * num3;
    let num8 = target + (num4 + num7) * num3;
    if (num5 - current > 0 === num8 > num5) {
      num8 = num5;
      currentVelocity = (num8 - num5) / deltaTime;
    }

    return { 'value': num8, 'velocity': currentVelocity };
  }

  /**
   * @param {vec2} val - set content displacement
   */
  _setContentOffset(val) {
    let position = [val.x, val.y];
    if (!this._contentWidget) {
      return;
    }

    if (!this._horizontal) {
      position[0] = this._contentWidget.offsetX;
    }

    if (!this._vertical) {
      position[1] = this._contentWidget.offsetY;
    }

    if (!vec2.equals(val, vec2.new(this._contentWidget.offsetX, this._contentWidget.offsetY))) {
      this._contentWidget.setOffset(position[0], position[1]);
      this._updateBound();
    }
  }

  /**
   * Update last frame of data
   * @private
   * @ignore
   */
  _updatePrevData() {
    vec2.set(this._lastPosition, this._contentWidget.offsetX, this._contentWidget.offsetY);
    this._lastContentBound = this._contentBound;
    this._lastViewBound = this._viewBound;
  }

  /**
   * Update the current scrollbar value
   */
  _updateScrollBar() {
    let outOffset = this._calculateOffset(vec2.zero());
    if (this._hScrollBarComp && this._hScrollBar.active && this._hScrollBarComp.handle) {
      this._hScrollBarComp.size = mathUtils.clamp01(this._viewBound.size.x / (this._contentBound.size.x + Math.abs(outOffset.x)));
      if (this._contentBound.size.x <= this._viewBound.size.x) {
        this._hScrollBarComp.value = this._viewBound.min.x <= this._contentBound.min.x ? 0 : 1;
      } else {
        let scrollAnchor = (this._viewBound.min.x - this._contentBound.min.x) / (this._contentBound.size.x - this._viewBound.size.x);
        this._hScrollBarComp.value = this._hScrollBarComp.reverse ? 1 - mathUtils.clamp01(scrollAnchor, 0, 1) : mathUtils.clamp01(scrollAnchor, 0, 1);
      }
    }

    if (this._vScrollBarComp && this._vScrollBar.active && this._vScrollBarComp.handle) {
      this._vScrollBarComp.size = mathUtils.clamp01(this._viewBound.size.y / (this._contentBound.size.y + Math.abs(outOffset.y)));
      if (this._contentBound.size.y <= this._viewBound.size.y) {
        this._vScrollBarComp.value = this._viewBound.min.x <= this._contentBound.min.x ? 0 : 1;
      } else {
        let scrollAnchor = (this._viewBound.min.y - this._contentBound.min.y) / (this._contentBound.size.y - this._viewBound.size.y);
        this._vScrollBarComp.value = this._vScrollBarComp.reverse ? 1 - mathUtils.clamp01(scrollAnchor, 0, 1) : mathUtils.clamp01(scrollAnchor, 0, 1);
      }
    }
  }

  /**
   * Dispatch value changes events
   */
  _emitValueChangedEvents() {
    this.dispatch('ScrollView.onValueChanged');
  }
}

ScrollViewComponent.events = {
  'mousedown': '_onMouseDown',
  'mousemove': '_onMouseMove',
  'mouseup': '_onMouseUp',
  'touchstart': '_onTouchStart',
  'touchmove': '_onTouchMove',
  'touchend': '_onTouchEnd'
};

ScrollViewComponent.schema = {
  horizontal: {
    type: 'boolean',
    default: true,
  },

  vertical: {
    type: 'boolean',
    default: true,
  },

  viewPort: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._viewPort === val) {
        return;
      }

      this._viewPort = val;
      if (!this._viewPort) {
        console.warn('ViewPort cannot be null');
      }

      if (this._viewPort) {
        this._viewPortWidget = this._viewPort.getComp('Widget');
      }
    }
  },

  content: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._content === val) {
        return;
      }

      this._content = val;
      if (!this._content) {
        console.warn('Content cannot be null');
        return;
      }

      if (this._content) {
        this._contentWidget = this._content.getComp('Widget');
      }
    }
  },

  movementType: {
    type: 'enums',
    default: 'clamped',
    options: ['unrestricted', 'elastic', 'clamped'],
  },

  elasticityDuration: {
    type: 'number',
    default: 0.1,
  },

  inertia: {
    type: 'boolean',
    default: true,
  },

  brake: {
    type: 'number',
    default: 0.135,
  },

  vScrollBar: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._vScrollBar === val) {
        return;
      }

      if (this._vScrollBarComp) {
        this._vScrollBar.off('ScrollBar.onValueChanged', this._updateScrollView);
      }

      this._vScrollBar = val;
      if (this._vScrollBar) {
        this._vScrollBar.on('ScrollBar.onValueChanged', this._updateScrollView);
        this._vScrollBarComp = this._vScrollBar.getComp('ScrollBar');
        this._vScrollBarComp.reverse = true;
        this._correctVisual();
      }
    }
  },

  hScrollBar: {
    type: 'entity',
    default: null,
    set(val) {
      if (!(val instanceof Entity)) {
        return;
      }

      if (this._hScrollBar === val) {
        return;
      }

      if (this._hScrollBarComp) {
        this._hScrollBar.off('ScrollBar.onValueChanged', this._updateScrollView);
      }

      this._hScrollBar = val;
      if (this._hScrollBar) {
        this._hScrollBar.on('ScrollBar.onValueChanged', this._updateScrollView);
        this._hScrollBarComp = this._hScrollBar.getComp('ScrollBar');
        this._correctVisual();
      }
    }
  },
};
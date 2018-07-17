import { vec3 } from '../../vmath';

/**
 * Surround boxes that can be used for UI use
 * @access public
 */
export default class Bounds {
  /**
   * Create the bounding box
   * @param {vec3} center - bound center
   * @param {vec3} size - bound size
   */
  constructor(center, size) {
    this._center = vec3.zero();
    vec3.copy(this._center, center);
    this._extents = vec3.zero();
    vec3.mul(this._extents,size, vec3.new(0.5, 0.5, 0.5));
    this._size = vec3.zero();
    this._min = vec3.zero();
    this._max = vec3.zero();
  }

  /**
   * Central point coordinates
   * @type {vec3}
   */
  set center(val) {
    this._center = val;
  }

  /**
   * @returns {vec3} - central point coordinates
   */
  get center() {
    return this._center;
  }

  /**
   * Surrounded by size
   * @type {vec3}
   */
  set size(val) {
    vec3.mul(this._extents, val, vec3.new(0.5, 0.5, 0.5));
  }

  /**
   * @returns {vec3} - surrounded by size
   */
  get size() {
    let value = vec3.zero();
    vec3.mul(value, this._extents, vec3.new(2, 2, 2));
    return value;
  }

  /**
   * Enclosing minimum coordinate
   * @type {vec3}
   */
  set min(val) {
    this.setMinMax(val, this._max);
  }

  /**
   * @returns {vec3} - enclosing minimum coordinate
   */
  get min() {
    let value = vec3.zero();
    vec3.subtract(value, this._center, this._extents);
    return value;
  }

  /**
   * Enclosing maximum coordinate
   * @type {vec3}
   */
  set max(val) {
    this.setMinMax(this._min, val);
  }

  /**
   * @returns {vec3} - enclosing maximum coordinate
   */
  get max() {
    let value = vec3.zero();
    vec3.add(value, this._center, this._extents);
    return value;
  }

  /**
   * Determines a rectangle from the largest and smallest position
   * @param {vec3} min - the bottom left corner of the rectangle
   * @param {vec3} max - the top right corner of the rectangle
   */
  setMinMax(min, max) {
    let value = vec3.zero();
    vec3.subtract(value, max, min);
    vec3.mul(value, value, vec3.new(0.5, 0.5, 0.5));
    vec3.set(this._extents, value.x, value.y, value.z);
    vec3.add(this._center, min, this._extents);
  }

  /**
   * @param {vec3} point - adjust min max value
   */
  encapsulate(point) {
    let min = vec3.zero(), max = vec3.zero();
    vec3.min(min, this.min, point);
    vec3.max(max, this.max, point);
    this.setMinMax(min, max);
  }
}

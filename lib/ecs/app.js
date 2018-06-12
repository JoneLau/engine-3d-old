import { FixedArray } from '../memop';
import { utils } from '../scene-graph';
import Entity from './entity';
import Level from './level';
import Schema from './schema';
import ComponentEvent from './event';

export default class App {
  /**
   * @param {object} opts
   * @param {number} opts.poolSize
   * @param {Array} opts.systems
   */
  constructor(opts = {}) {
    const poolSize = opts.poolSize || 100;

    this._types = {};
    this._classes = {};
    this._systems = [];

    this._activeLevel = new Level();
    this._activeLevel._app = this;
    this._activeLevel.activate();

    // NOTE: we don't use recycles pool here because reused entity may be refereced by others
    this._entities = new FixedArray(poolSize);
    this._deadComponents = new FixedArray(poolSize);
    this._deadEntities = new FixedArray(poolSize);

    //
    if (opts.systems) {
      for (let i = 0; i < opts.systems.length; ++i) {
        let info = opts.systems[i];
        this.registerSystem(
          info.id,
          info.system,
          info.component,
          info.priority
        );
      }
    }
    this._sortSystems();
  }

  /**
   * @property {Level}
   */
  get activeLevel() {
    return this._activeLevel;
  }

  /**
   * @param {string} name
   * @param {object} info
   */
  registerType(name, info) {
    this._types[name] = info;
  }

  /**
   * @param {string} name
   * @param {class} cls
   */
  registerClass(name, cls) {
    cls.__classname__ = name;

    let schema = null;
    if (cls.hasOwnProperty('schema')) {
      schema = cls.schema;
    }

    if (schema) {
      let prototypeAccessors = Schema.createPrototypeAccessors(this, schema);
      Object.defineProperties(cls.prototype, prototypeAccessors);
    }

    // add name to cls
    this._classes[name] = cls;
  }

  /**
   * @param {string} id
   * @param {string} systemCls
   * @param {string} compClsName
   * @param {number} priority
   */
  registerSystem(id, systemCls, compClsName, priority = 0) {
    let sys = new systemCls();

    sys._id = id;
    sys._app = this;
    sys._priority = priority;
    sys._componentCls = this.getClass(compClsName);
    if (!sys._componentCls) {
      console.warn(`Failed to get class ${compClsName}, please register it first.`);
    }

    sys.init();

    this._systems.push(sys);

    return sys;
  }

  /**
   * @param {string} name
   */
  getType(name) {
    return this._types[name];
  }

  /**
   * @param {string} name
   */
  getClass(name) {
    return this._classes[name];
  }

  /**
   * @param {function|object} clsOrInst
   */
  getClassName(clsOrInst) {
    if (typeof clsOrInst === 'function') {
      return clsOrInst.__classname__;
    }

    return clsOrInst.constructor.__classname__;
  }

  /**
   * @param {string} classname
   * @param {object} data
   */
  createObject(classname, data) {
    const ctor = this.getClass(classname);
    let obj = new ctor();
    Schema.parse(this, obj, data || {});

    return obj;
  }

  /**
   * @param {string} name
   * @param {Level} level
   */
  createEntity(name, level = null) {
    let ent = new Entity(name);
    ent._app = this;
    ent._active = true;
    this._entities.push(ent);

    let lv = level || this._activeLevel;
    if (lv) {
      ent.setParent(lv);
    }

    return ent;
  }

  /**
   * @param {Entity} ent
   */
  cloneEntity(ent) {
    // clone & deepClone will mute the event and component callback
    return utils.clone(ent, Entity, (newEnt, src) => {
      newEnt._app = this;
      newEnt._active = src._active;

      // clone components
      for (let i = 0; i < src._comps.length; ++i) {
        let comp = src._comps[i];

        // skip destroyed component
        if (comp._destroyed) {
          continue;
        }

        // create & clone the component
        let newComp = this._createComp(comp.constructor, newEnt, comp);
        newComp._enabled = comp._enabled;

        // invoke onClone
        if (newComp.onClone) {
          newComp.onClone(comp);
        }

        // add component to entity
        newEnt._comps.push(newComp);
      }
      this._entities.push(newEnt);
    });
  }

  /**
   * @param {Entity} ent
   */
  deepCloneEntity(ent) {
    // clone & deepClone will mute the event and component callback
    return utils.deepClone(ent, Entity, (newEnt, src) => {
      newEnt._app = this;
      newEnt._active = src._active;

      // clone components
      for (let i = 0; i < src._comps.length; ++i) {
        let comp = src._comps[i];

        // skip destroyed component
        if (comp._destroyed) {
          continue;
        }

        // create & clone the component
        let newComp = this._createComp(comp.constructor, newEnt, comp);
        newComp._enabled = comp._enabled;

        // invoke onClone
        if (newComp.onClone) {
          newComp.onClone(comp);
        }

        // add component to entity
        newEnt._comps.push(newComp);
      }
      this._entities.push(newEnt);
    });
  }

  /**
   * @param {Level} level
   */
  loadLevel(level) {
    if (this._activeLevel) {
      utils.walk(this._activeLevel, ent => {
        ent.destroy();
      });
    }

    this._activeLevel = level;
    this._activeLevel._app = this;
    this._activeLevel.activate();
  }

  /**
   *
   */
  tick() {
    // tick all systems
    for (let i = 0; i < this._systems.length; ++i) {
      let sys = this._systems[i];
      sys.tick();
    }

    // post-tick all systems
    for (let i = 0; i < this._systems.length; ++i) {
      let sys = this._systems[i];
      sys.postTick();
    }

    // handle dead components
    for (let i = 0; i < this._deadComponents.length; ++i) {
      let comp = this._deadComponents.data[i];

      comp._onComponentNeedDestroy();
      comp._entity._removeComp(comp);

      for (let j = 0; j < comp.__events__.length; ++j) {
        let evt = comp.__events__[j];
        comp._entity.off(evt.name, evt.fn);
      }

      // de-reference
      comp._app = null;
      comp._system = null;
      comp._entity = null;
    }

    // handle dead entities
    for (let i = 0; i < this._deadEntities.length; ++i) {
      let ent = this._deadEntities.data[i];

      // emit destroy event
      ent.emit('destroy');

      // removed from parent
      if (ent._parent && ent._parent._destroyed === false) {
        ent.setParent(null);
      }

      // unmanage it
      let lastEnt = this._entities.data[this._entities.length - 1];
      this._entities.fastRemove(ent._poolID);
      lastEnt._poolID = ent._poolID;

      // de-reference
      ent._poolID = -1;
      ent._app = null;
      ent._parent = null;
      ent._children.length = 0;
      ent._comps.length = 0;
    }

    // reset pool
    this._deadComponents.reset();
    this._deadEntities.reset();
  }

  /**
   * @param {string} id
   */
  system(id) {
    for (let i = 0; i < this._systems.length; ++i) {
      let sys = this._systems[i];
      if (sys._id === id) {
        return sys;
      }
    }

    return null;
  }

  // ====================
  // internal
  // ====================

  _getSystem(comp) {
    for (let i = 0; i < this._systems.length; ++i) {
      let sys = this._systems[i];
      if (comp instanceof sys._componentCls) {
        return sys;
      }
    }

    return null;
  }

  _destroyEntity(ent) {

    this._deadEntities.push(ent);
  }

  _finalizeComp(comp, data, entities) {
    let ent = comp._entity;
    let proto = comp.constructor;

    // add event listeners
    while (proto.__classname__ !== undefined) {
      if (proto.hasOwnProperty('events')) {
        for (let name in proto.events) {
          let method = proto.events[name];
          let fn = comp[method];
          if (fn) {
            fn = fn.bind(comp);
            ent.on(name, fn);
            comp.__events__.push({ name, fn });
          }
        }
      }
      proto = Object.getPrototypeOf(proto);
    }

    // parse schema data
    Schema.parse(this, comp, data, entities);
  }

  _createComp(ctor, ent, data = {}) {
    let comp = new ctor();
    comp._app = this;
    comp._system = this._getSystem(comp);
    comp._entity = ent;
    comp.__events__ = [];

    this._finalizeComp(comp, data, null);

    return comp;
  }

  _destroyComp(comp) {
    //
    this._deadComponents.push(comp);
  }

  _sortSystems() {
    this._systems.sort((a, b) => {
      return a._priority - b._priority;
    });
  }

  emitComponentEvents(events) {
    // TODO: need to add arguments
    for (let i = 0; i < events.length; ++i) {
      let event = events[i];
      if (!(event instanceof ComponentEvent)) {
        continue;
      }

      event.emit();
    }
  }
}
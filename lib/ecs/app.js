import { FixedArray } from '../memop';
import { utils } from '../scene-graph';
import Entity from './entity';
import Level from './level';
import Schema from './schema';

function _initComps(ent) {
  for (let i = 0; i < ent._comps.length; ++i) {
    let comp = ent._comps[i];
    if (comp.onInit) {
      comp.onInit();
    }
  }
}

function _emitEnableChanged(ent, enabled) {
  if (enabled) {
    ent.emit('enable');

    for (let i = 0; i < ent._comps.length; ++i) {
      let comp = ent._comps[i];
      if (comp._enabled && comp.onEnable) {
        comp.onEnable();
      }
    }
  } else {
    ent.emit('disable');

    for (let i = 0; i < ent._comps.length; ++i) {
      let comp = ent._comps[i];
      if (comp._enabled && comp.onDisable) {
        comp.onDisable();
      }
    }
  }
}

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

    // NOTE: we don't use recycles pool here because reused entity may be refereced by others
    this._entities = new FixedArray(poolSize);
    this._newComponents = new FixedArray(poolSize);
    this._deadComponents = new FixedArray(poolSize);
    this._newEntities = new FixedArray(poolSize);
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

    let lv = level || this._activeLevel;
    if (lv) {
      ent.setParent(lv);
      if (lv === this._activeLevel) {
        this._newEntities.push(ent);
      }
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
      newEnt._enabled = src._enabled;

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

      this._newEntities.push(newEnt);
    });
  }

  /**
   * @param {Entity} ent
   */
  deepCloneEntity(ent) {
    // clone & deepClone will mute the event and component callback
    return utils.deepClone(ent, Entity, (newEnt, src) => {
      newEnt._app = this;
      newEnt._enabled = src._enabled;

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

      this._newEntities.push(newEnt);
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

    utils.walk(level, ent => {
      this._newEntities.push(ent);
    });
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

    // handle new entities
    for (let i = 0; i < this._newEntities.length; ++i) {
      let ent = this._newEntities.data[i];

      // skip dead entity
      if (ent._destroyed) {
        continue;
      }

      ent._poolID = this._entities.length;
      ent._ready = true;

      // manage it
      this._entities.push(ent);

      // invoke onInit
      _initComps(ent);

      // emit enable event and trigger cmoponents' onEnable callback
      if (ent.enabledInHierarchy) {
        _emitEnableChanged(ent, true);
      }

      // emit ready event
      ent.emit('ready');
    }

    // UNUSED
    // handle new components
    // for (let i = 0; i < this._newComponents.length; ++i) {
    //   let comp = this._newComponents.data[i];
    //   if (comp._entity._destroyed === false) {
    //     // do something...
    //   }
    // }

    // handle dead components
    for (let i = 0; i < this._deadComponents.length; ++i) {
      let comp = this._deadComponents.data[i];

      // no need to remove comp from entity if it is destroyed
      if (comp._entity._destroyed === false) {
        comp._entity._removeComp(comp);
      }

      if (comp.onDestroy) {
        comp.onDestroy();
      }

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
      if (ent._ready) {
        let lastEnt = this._entities.data[this._entities.length - 1];
        this._entities.fastRemove(ent._poolID);
        lastEnt._poolID = ent._poolID;
      }

      // de-reference
      ent._poolID = -1;
      ent._app = null;
      ent._parent = null;
      ent._children.length = 0;
      ent._comps.length = 0;
    }

    // reset pool
    this._newComponents.reset();
    this._deadComponents.reset();
    this._newEntities.reset();
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
    // emit disable
    if (ent._ready && ent.enabledInHierarchy) {
      ent.emit('disable');
    }

    this._deadEntities.push(ent);
  }

  _notifyEnableChanged(ent, enabled) {
    // emit event and trigger cmoponents' onEnable/onDisble callback at root
    _emitEnableChanged(ent, enabled);

    // recursively emit event trigger cmoponents' onEnable/onDisble callback in children
    utils.walkSibling(ent, function (n) {
      if (n._enabled) {
        _emitEnableChanged(n, enabled);
        return true;
      }

      return false;
    });
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

    // add event listeners
    let proto = ctor;
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
    Schema.parse(this, comp, data);

    // invoke onInit & onEnable when entity is ready
    if (ent._ready) {
      // invoke onInit
      if (comp.onInit) {
        comp.onInit();
      }

      // invoke onEnable
      if (comp.onEnable && comp._enabled && ent.enabledInHierarchy) {
        comp.onEnable();
      }
    }

    //
    this._newComponents.push(comp);

    return comp;
  }

  _destroyComp(comp) {
    let ent = comp._entity;

    // invoke onDisable
    if (comp.onDisable && comp._enabled && ent._ready && ent.enabledInHierarchy) {
      comp.onDisable();
    }

    //
    this._deadComponents.push(comp);
  }

  _sortSystems() {
    this._systems.sort((a, b) => {
      return a._priority - b._priority;
    });
  }
}
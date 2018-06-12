
export default class ComponentEvent {
  // /**
  //  * @param {string} name
  //  * @param {object} opts
  //  * @param {array} [opts.detail]
  //  * @param {boolean} [opts.bubbles]
  //  */
  // constructor(opts) {
  //   super(opts);

  // }

  emit() {
    if (!this.target) {
      return;
    }

    let comp = this.target.getComp(this.component);
    if (!comp) {
      return;
    }

    let handler = comp[this.handler];
    if (!handler || !(handler instanceof Function)) {
      return;
    }

    let param = [];
    if (this.customEventData && this.customEventData.length > 0) {
      param.push(this.customEventData);
    }

    handler.apply(comp, param);
  }
}

ComponentEvent.schema = {
  target: {
    type: 'entity',
    default: null,
  },

  component: {
    type: 'string',
    default: '',
  },

  handler: {
    type: 'string',
    default: '',
  },

  customEventData: {
    type: 'string',
    default: '',
  }
}
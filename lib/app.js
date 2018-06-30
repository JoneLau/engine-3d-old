import gfx from './gfx';
import renderer from './renderer';
import Input from './input';
import { App as AppBase } from './ecs';
import { EventEmitter } from './event-sys';
import { utils as sceneUtils } from './scene-graph';
import { vec2, vec3 } from './vmath';
import { intersect } from './geom-utils';
import Sys from './platform/sys';
import Configuration from './platform/configuration';

import registry from './misc/registry';
import AssetMng from './assets/asset-mng';
import Debugger from './debugger';

// TODO: chunks and templates should move to renderer
import initBuiltins from './builtin/init';
import types from './builtin/types';

// loader
import meshLoader from './loaders/mesh-loader';
import materialLoader from './loaders/material-loader';
import textureLoader from './loaders/texture-loader';
import prefabLoader from './loaders/prefab-loader';
import gltfLoader from './loaders/gltf-loader';
import animationLoader from './loaders/animation-loader';
import audioLoader from './loaders/audio-loader';
import bmfontLoader from './loaders/bmfont-loader';
import otfontLoader from './loaders/otfont-loader';
// import effectLoader from './loaders/effect-loader';

// builtin components & systems
import ScriptComponent from './framework/script-component';
import CameraComponent from './framework/camera-component';
import LightComponent from './framework/light-component';
import ModelComponent from './framework/model-component';
import SkinningModelComponent from './framework/skinning-model-component';
import AnimationComponent from './framework/animation-component';
import AudioSourceComponent from './framework/audio-source-component';
import SkyboxComponent from './framework/skybox-component';
import ParticleSystemComponent from './framework/particle/particle-system-component';

import ScreenComponent from './framework/ui/screen-component';
import ScreenScalerComponent from './framework/ui/screen-scaler-component';
import WidgetComponent from './framework/ui/widget-component';
import ImageComponent from './framework/ui/image-component';
import TextComponent from './framework/ui/text-component';
import MaskComponent from './framework/ui/mask-component';
import UIElementComponent from './framework/ui/ui-element-component';
import UIElementSystem from './framework/ui/ui-element-system';
import ButtonComponent from './framework/ui/button-component';
import ToggleComponent from './framework/ui/toggle-component';
import ToggleGroupComponent from './framework/ui/toggle-group-component';
import SliderComponent from './framework/ui/slider-component';
import EditBoxComponent from './framework/ui/edit-box-component';
import ScrollBarComponent from './framework/ui/scroll-bar-component';
import ScrollViewComponent from './framework/ui/scroll-view-component';
import GridLayoutComponent from './framework/ui/grid-layout-component';

import ScriptSystem from './framework/script-system';
import SkinningModelSystem from './framework/skinning-model-system';
import AnimationSystem from './framework/animation-system';
import AudioSystem from './framework/audio-system';
import WidgetSystem from './framework/ui/widget-system';
import ParticleSystemManager from './framework/particle/particle-system-manager';

// other classes
import { Keyframe, AnimationCurve } from './geom-utils/curve';

// register builtin asset loader
registry.registerLoader('mesh', meshLoader);
registry.registerLoader('material', materialLoader);
registry.registerLoader('texture', textureLoader);
registry.registerLoader('prefab', prefabLoader);
registry.registerLoader('gltf', gltfLoader);
registry.registerLoader('animation', animationLoader);
registry.registerLoader('audio', audioLoader);
registry.registerLoader('bmfont', bmfontLoader);
registry.registerLoader('otfont', otfontLoader);
// this.registerLoader('effect', effectLoader);

// register builtin types
for (let name in types) {
  registry.registerType(name, types[name]);
}

// register builtin components
registry.registerClass('Script', ScriptComponent);
registry.registerClass('Camera', CameraComponent);
registry.registerClass('Light', LightComponent);
registry.registerClass('Model', ModelComponent);
registry.registerClass('SkinningModel', SkinningModelComponent);
registry.registerClass('Animation', AnimationComponent);
registry.registerClass('AudioSource', AudioSourceComponent);
registry.registerClass('Skybox', SkyboxComponent);
registry.registerClass('Screen', ScreenComponent);
registry.registerClass('ScreenScaler', ScreenScalerComponent);
registry.registerClass('Widget', WidgetComponent);
registry.registerClass('Mask', MaskComponent);
registry.registerClass('Image', ImageComponent);
registry.registerClass('Text', TextComponent);
registry.registerClass('UIElement', UIElementComponent);
registry.registerClass('Button', ButtonComponent);
registry.registerClass('Toggle', ToggleComponent);
registry.registerClass('ToggleGroup', ToggleGroupComponent);
registry.registerClass('Slider', SliderComponent);
registry.registerClass('EditBox', EditBoxComponent);
registry.registerClass('ScrollBar', ScrollBarComponent);
registry.registerClass('ScrollView', ScrollViewComponent);
registry.registerClass('GridLayout', GridLayoutComponent);
registry.registerClass('ParticleSystem', ParticleSystemComponent);

// register builtin systems
registry.registerSystem('script', ScriptSystem, 'Script', 0);
registry.registerSystem('skinning-model', SkinningModelSystem, 'SkinningModel', 100);
registry.registerSystem('animation', AnimationSystem, 'Animation', 200);
registry.registerSystem('audio', AudioSystem, 'AudioSource', 200);
registry.registerSystem('widget', WidgetSystem, 'Widget', 100);
registry.registerSystem('ui-element', UIElementSystem, 'UIElement', 101);
registry.registerSystem('particle-system', ParticleSystemManager, 'ParticleSystem', 100);

// register other classes
registry.registerClass('Keyframe', Keyframe);
registry.registerClass('AnimationCurve', AnimationCurve);

function _makeTick(app_) {
  const app = app_;

  return function (timestamp) {
    app._tickID = requestAnimationFrame(app._tick);

    // update timer
    if (timestamp === undefined) {
      timestamp = 0;
    }
    app.deltaTime = (timestamp - app._lasttime) / 1000;
    app.totalTime = timestamp / 1000;
    app._lasttime = timestamp;

    // tick debugger
    app._debugger.tick();

    // emit tick event
    app.emit('tick');

    // tick systems
    app.tick();

    // commit debugger commands
    app._debugger.postTick();

    // render the scene
    app._forward.render(app.scene);

    // TODO
    // app.lstats.tick();

    // reset internal states
    app._input.reset();
    app._scene.reset();
  };
}

export default class App extends AppBase {
  constructor(canvas, opts = {}) {
    super({
      poolSize: opts.poolSize || 100,
    });
    this.__initEventEmitter();

    // sub-modules (canvas)
    this._canvas = canvas;
    this._container = document.createElement('div');
    if (this._canvas.parentNode) {
      this._canvas.parentNode.insertBefore(this._container, this._canvas);
    }
    this._container.setAttribute('id', 'cocos3dContainer');
    this._container.appendChild(this._canvas);
    this._container.style.height = '100%';
    this._availSize = vec2.new(300, 150);

    this._input = new Input(canvas, {
      lock: false,
      invertY: true,
    });
    this._device = new gfx.Device(canvas, opts);
    let builtins = initBuiltins(this._device);

    // sub-modules (renderer)
    renderer.addStage('opaque');
    renderer.addStage('transparent');
    renderer.addStage('ui');
    renderer.addStage('shadowcast');

    this._forward = new renderer.ForwardRenderer(this._device, {
      defaultTexture: builtins['default-texture']._texture,
      defaultTextureCube: builtins['default-texture-cube']._texture,
    });
    this._scene = new renderer.Scene();

    // sub-modules (engine)
    this._assetMng = new AssetMng(this);
    this._debugger = new Debugger(this);
    this._sys = new Sys();
    this._configuration = new Configuration(this);

    // register builtin assets
    for (let name in builtins) {
      let asset = builtins[name];
      this._assetMng.add(asset._uuid, asset);
    }

    // register extensions
    registry._init(this);

    // sort systems
    this._sortSystems();

    // life callback
    this._tick = _makeTick(this);

    // public
    this.deltaTime = 0;
    this.totalTime = 0;

    // internal
    this._tickID = null;
    this._lasttime = 0;
    this._activeCamera = null;

    window.addEventListener('resize', () => {
      this.resize();
    });

    window.addEventListener('orientationchange', () => {
      this._orientationChange();
    });
  }

  get device() {
    return this._device;
  }

  get scene() {
    return this._scene;
  }

  get input() {
    return this._input;
  }

  get assets() {
    return this._assetMng;
  }

  get debugger() {
    return this._debugger;
  }

  get sys() {
    return this._sys;
  }

  get configuration() {
    return this._configuration;
  }

  get availSize() {
    return this._availSize;
  }

  run() {
    if (!this._activeLevel) {
      console.warn('There is no level to run, please load it first');
      return;
    }

    this._tickID = requestAnimationFrame(this._tick);
  }

  resize() {
    if (!this._canvas) {
      return;
    }

    let bcr = this._container.parentElement.getBoundingClientRect();
    vec2.set(this._availSize, bcr.width, bcr.height);
    this._configuration.windowResize();

    this._input.resize();
  }

  _orientationChange() {
    this._configuration.windowResize();
  }

  destroy() {
    this._canvas = null;
    this._input.destroy();
    this._activeLevel.destroy();
    this._activeLevel = null;
    if (this._tickID) {
      cancelAnimationFrame(this._tickID);
    }
  }

  find(path, refNode) {
    if (!path) {
      return null;
    }

    refNode = refNode || this._activeLevel;
    return sceneUtils.find(refNode, path);
  }
}
EventEmitter.mixin(App);
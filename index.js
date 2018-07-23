import App from './lib/app';

// misc
import resl from './lib/misc/resl';
import path from './lib/misc/path';
import async from './lib/misc/async';
import utils from './lib/misc/utils';
import registry from './lib/misc/registry';

// components
import ScriptComponent from './lib/framework/script-component';
import CameraComponent from './lib/framework/camera-component';
import LightComponent from './lib/framework/light-component';
import ModelComponent from './lib/framework/model-component';
import SkinningModelComponent from './lib/framework/skinning-model-component';
import AnimationComponent from './lib/framework/animation-component';
import AudioSourceComponent from './lib/framework/audio-source-component';
import SkyboxComponent from './lib/framework/skybox-component';
import ParticleSystemComponent from './lib/framework/particle/particle-system-component';

// ui-widget components
import ScreenComponent from './lib/framework/ui/screen-component';
import ScreenScalerComponent from './lib/framework/ui/screen-scaler-component';
import WidgetComponent from './lib/framework/ui/widget-component';
import ImageComponent from './lib/framework/ui/image-component';
import TextComponent from './lib/framework/ui/text-component';
import MaskComponent from './lib/framework/ui/mask-component';
import UIElementComponent from './lib/framework/ui/ui-element-component';
import ButtonComponent from './lib/framework/ui/button-component';
import ToggleComponent from './lib/framework/ui/toggle-component';
import ToggleGroupComponent from './lib/framework/ui/toggle-group-component';
import SliderComponent from './lib/framework/ui/slider-component';
import EditBoxComponent from './lib/framework/ui/edit-box-component';
import ScrollBarComponent from './lib/framework/ui/scroll-bar-component';
import BoundComponent from './lib/framework/ui/bound-component';
import ScrollViewComponent from './lib/framework/ui/scroll-view-component';
import GridLayoutComponent from './lib/framework/ui/grid-layout-component';

// assets
import Asset from './lib/assets/asset';
import Mesh from './lib/assets/mesh';
import Joints from './lib/assets/joints';
import Material from './lib/assets/material';
import Prefab from './lib/assets/prefab';
import AnimationClip from './lib/assets/animation-clip';
import AudioClip from './lib/assets/audio-clip';
import Gltf from './lib/assets/gltf';
import Texture from './lib/assets/texture';
import Texture2D from './lib/assets/texture-2d';
import TextureCube from './lib/assets/texture-cube';
import Sprite from './lib/assets/sprite';

// deps
import { Node } from './lib/scene-graph';
import { Component, System, Level } from './lib/ecs';
import * as math from './lib/vmath';
import * as geometry from './lib/geom-utils';
import * as primitives from './lib/primitives';
import renderer from './lib/renderer';
import gfx from './lib/gfx';
import * as memop from './lib/memop';
import input from './lib/input';

export default {
  // registry
  registerLoader: registry.registerLoader,
  registerClass: registry.registerClass,
  registerSystem: registry.registerSystem,

  // ecs.js
  Node,

  // assets
  Asset,
  Mesh,
  Joints,
  Material,
  Prefab,
  AnimationClip,
  AudioClip,
  Gltf,
  Texture,
  Texture2D,
  TextureCube,
  Sprite,

  // framework
  App,
  Level,
  System,
  Component,

  // components
  ScriptComponent,
  CameraComponent,
  LightComponent,
  ModelComponent,
  SkinningModelComponent,
  AnimationComponent,
  AudioSourceComponent,
  SkyboxComponent,
  ParticleSystemComponent,

  // ui-widget components
  ScreenComponent,
  ScreenScalerComponent,
  WidgetComponent,
  ImageComponent,
  TextComponent,
  MaskComponent,
  UIElementComponent,
  ButtonComponent,
  ToggleComponent,
  ToggleGroupComponent,
  SliderComponent,
  EditBoxComponent,
  ScrollBarComponent,
  BoundComponent,
  ScrollViewComponent,
  GridLayoutComponent,

  // modules
  math,
  geometry,
  memop,
  primitives,
  renderer,
  gfx,

  // misc
  utils,
  resl,
  path,
  input,
  async,
};
import gfx from '../gfx';
import renderer from '../renderer';
import resl from '../misc/resl';
import Effect from '../assets/effect';

const _typeMap = {
  float: renderer.PARAM_FLOAT,
  float2: renderer.PARAM_FLOAT2,
  float3: renderer.PARAM_FLOAT3,
  float4: renderer.PARAM_FLOAT4,
  color3: renderer.PARAM_COLOR3,
  color4: renderer.PARAM_COLOR4,
  texture2d: renderer.PARAM_TEXTURE_2D,
  textureCube: renderer.PARAM_TEXTURE_CUBE
};

const _passMap = {
  back: gfx.CULL_BACK,
  front: gfx.CULL_FRONT,
  add: gfx.BLEND_FUNC_ADD,
  subtract: gfx.BLEND_FUNC_SUBTRACT,
  reverseSubtract: gfx.BLEND_FUNC_REVERSE_SUBTRACT,
  zero: gfx.BLEND_ZERO,
  one: gfx.BLEND_ONE,
  srcColor: gfx.BLEND_SRC_COLOR,
  oneMinusSrcColor: gfx.BLEND_ONE_MINUS_SRC_COLOR,
  dstColor: gfx.BLEND_DST_COLOR,
  oneMinusDstColor: gfx.BLEND_ONE_MINUS_DST_COLOR,
  srcAlpha: gfx.BLEND_SRC_ALPHA,
  oneMinusSrcAlpha: gfx.BLEND_ONE_MINUS_SRC_ALPHA,
  dstAlpha: gfx.BLEND_DST_ALPHA,
  oneMinusDstAlpha: gfx.BLEND_ONE_MINUS_DST_ALPHA,
  constColor: gfx.BLEND_CONSTANT_COLOR,
  oneMinusConstColor: gfx.BLEND_ONE_MINUS_CONSTANT_COLOR,
  constAlpha: gfx.BLEND_CONSTANT_ALPHA,
  oneMinusConstAlpha: gfx.BLEND_ONE_MINUS_CONSTANT_ALPHA,
  srcAlphaSaturate: gfx.BLEND_SRC_ALPHA_SATURATE,
  [true]: true,
  [false]: false
};

function createEffect(json) {
  let effectAsset = new Effect();
  effectAsset._name = json.name;
  effectAsset._uuid = `custom-effect-${json.name}`;
  effectAsset._loaded = true;
  for (let i = 0; i < json.techniques.length; ++i) {
    let jsonTech = json.techniques[i];
    for (let j = 0; j < jsonTech.params.length; ++j) {
      let param = jsonTech.params[j];
      param.type = _typeMap[param.type];
    }
    for (let j = 0; j < jsonTech.passes.length; ++j) {
      let jsonPass = jsonTech.passes[j];
      for (let key in jsonPass) {
        if (key === 'program') {
          continue;
        }
        jsonPass[key] = _passMap[jsonPass[key]];
      }
    }
  }
  effectAsset.techniques = json.techniques;
  effectAsset.properties = json.properties;
  effectAsset.defines = json.defines;
  effectAsset.dependencies = json.dependencies ? json.dependencies : [];
  return effectAsset;
}

export default function (app, urls, callback) {
  resl({
    manifest: {
      json: {
        type: 'text',
        parser: JSON.parse,
        src: urls.json,
      },
    },

    onDone(data) {
      const { json } = data;
      let effectAsset = createEffect(json);
      callback(null, effectAsset);
    }
  });
}

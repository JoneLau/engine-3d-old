// Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

uniform sampler2D mainTexture;
varying vec2 uv;
varying vec4 color;

void main () {
  // TODO: soft particle
  gl_FragColor = color * texture2D(mainTexture, uv) * color.a;
}
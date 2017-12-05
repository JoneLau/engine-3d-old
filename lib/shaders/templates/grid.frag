varying vec2 uv0;
varying vec4 pos_w;

#ifdef USE_WORLD_POS
  varying vec3 normal_w;
#endif

uniform vec2 tiling;

uniform vec3 baseColorWhite;
uniform vec3 baseColorBlack;
uniform sampler2D basePattern;
uniform vec2 basePatternTiling;
uniform vec2 basePatternOffset;

uniform vec4 subPatternColor;
uniform sampler2D subPattern;
uniform vec2 subPatternTiling;
uniform vec2 subPatternOffset;

uniform vec4 subPatternColor2;
uniform sampler2D subPattern2;
uniform vec2 subPattern2Tiling;
uniform vec2 subPattern2Offset;

void main () {
  vec2 uv = uv0 * tiling;
  vec2 uvBase = uv * basePatternTiling + basePatternOffset;
  vec2 uvSub = uv * subPatternTiling + subPatternOffset;
  vec2 uvSub2 = uv * subPattern2Tiling + subPattern2Offset;

  #ifdef USE_WORLD_POS
    vec3 dnormal_w = normalize(normal_w);

    if (abs(dnormal_w.x)>0.5) { // side
      uvBase = (pos_w.zy * tiling * basePatternTiling) + basePatternOffset;
      uvSub = (pos_w.zy * tiling * subPatternTiling) + subPatternOffset;
      uvSub2 = (pos_w.zy * tiling * subPattern2Tiling) + subPattern2Offset;
    } else if (abs(dnormal_w.z)>0.5) { // front
      uvBase = (pos_w.xy * tiling * basePatternTiling) + basePatternOffset;
      uvSub = (pos_w.xy * tiling * subPatternTiling) + subPatternOffset;
      uvSub2 = (pos_w.xy * tiling * subPattern2Tiling) + subPattern2Offset;
    } else { // top
      uvBase = (pos_w.xz * tiling * basePatternTiling) + basePatternOffset;
      uvSub = (pos_w.xz * tiling * subPatternTiling) + subPatternOffset;
      uvSub2 = (pos_w.xz * tiling * subPattern2Tiling) + subPattern2Offset;
    }
  #endif

  vec4 texColBase = texture2D(basePattern, uvBase);
  vec4 texColSub = texture2D(subPattern, uvSub);
  vec4 texColSub2 = texture2D(subPattern2, uvSub2);

  // texColBase.rgb = gammaToLinearSpace(texColBase.rgb);
  // texColSub.rgb = gammaToLinearSpace(texColSub.rgb);
  // texColSub2.rgb = gammaToLinearSpace(texColSub2.rgb);

  vec4 color = vec4(baseColorWhite,1) * texColBase + vec4(baseColorBlack,1) * (1.0-texColBase);
  color =
    color * (1.0 - texColSub) +
    (subPatternColor * subPatternColor.a + color * (1.0-subPatternColor.a)) * texColSub
    ;
  color =
    color * (1.0 - texColSub2) +
    (subPatternColor2 * subPatternColor2.a + color * (1.0-subPatternColor2.a)) * texColSub2
    ;

  // gamma correction.
  // color.rgb = linearToGammaSpace(color.rgb);

  gl_FragColor = color;
}
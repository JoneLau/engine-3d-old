{{#useNormalTexture}}
#extension GL_OES_standard_derivatives : enable
{{/useNormalTexture}}

varying vec3 pos_w;
uniform vec3 eye;

const float PI = 3.14159265359;

{{#useNormal}}
  varying vec3 normal_w;
{{/useNormal}}

{{#useUV0}}
  varying vec2 uv0;
{{/useUV0}}

// material parameters
uniform vec3 albedo;
{{#useAlbedoTexture}}
  uniform sampler2D albedoTexture;
{{/useAlbedoTexture}}

uniform float metallic;
{{#useMetallicTexture}}
  uniform sampler2D metallicTexture;
{{/useMetallicTexture}}

uniform float roughness;
{{#useRoughnessTexture}}
  uniform sampler2D roughnessTexture;
{{/useRoughnessTexture}}

uniform float ao;
{{#useAoTexture}}
  uniform sampler2D aoTexture;
{{/useAoTexture}}

{{#useNormalTexture}}
  uniform vec2 normalMapTiling;
  uniform vec2 normalMapOffset;
  uniform sampler2D normalTexture;
  // get world-space normal from normal texture
  vec3 getNormalFromTexture() {
    vec3 tangentNormal = texture2D(normalTexture, uv0).rgb * 2.0 - 1.0;
    vec3 q1  = dFdx(pos_w)；
    vec3 q2  = dFdy(pos_w);
    vec2 uv  = uv0 * normalMapTiling + normalMapOffset;
    vec2 st1 = dFdx(uv);
    vec2 st2 = dFdy(uv);
    vec3 N   = normalize(normal_w);
    vec3 T   = normalize(q1*st2.t - q2*st1.t);
    vec3 B   = -normalize(cross(N, T));
    mat3 TBN = mat3(T, B, N);

    return normalize(TBN * tangentNormal);
  }
{{/useNormalTexture}}

{{> pbr_lighting.frag}}

// Cook-Torrance BRDF model (https://learnopengl.com/#!PBR/Theory)
// D() Normal distribution function
float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  float nom   = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;

  return nom / denom;
}
// G() Geometry function
float geometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  float nom   = NdotV;
  float denom = NdotV * (1.0 - k) + k;

  return nom / denom;
}
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = geometrySchlickGGX(NdotV, roughness);
  float ggx1 = geometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}
// F() Fresnel equation
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
// BRDF equation
vec3 brdf(LightInfo lightInfo, vec3 N, vec3 V, vec3 F0, vec3 albedo, float roughness) {
  vec3 H = normalize(V + pointLight.lightDir);
  float NDF = DistributionGGX(N, H, roughness);
  float G   = GeometrySmith(N, V, lightInfo.lightDir, roughness);
  vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);
  vec3 nominator    = NDF * G * F;
  float denominator = 4 * max(dot(N, V), 0.0) * max(dot(N, lightInfo.lightDir), 0.0) + 0.001; // 0.001 to prevent divide by zero.
  vec3 specular = nominator / denominator;
  // kS is equal to Fresnel
  vec3 kS = F;
  // for energy conservation, the diffuse and specular light can't
  // be above 1.0 (unless the surface emits light); to preserve this
  // relationship the diffuse component (kD) should equal 1.0 - kS.
  vec3 kD = vec3(1.0) - kS;
  // multiply kD by the inverse metalness such that only non-metals
  // have diffuse lighting, or a linear blend if partly metal (pure metals
  // have no diffuse light).
  kD *= 1.0 - metallic;
  float NdotL = max(dot(N, lightInfo.lightDir), 0.0);

  return (kD * albedo / PI + specular) * lightInfo.radiance * NdotL;
}


void main() {
  {{#useAlbedoTexture}}
    vec3 albedo     = texture2D(albedoTexture, uv0).rgb; // without gamma-correction
  {{/useAlbedoTexture}}
  // TODO: pack metallic and roughness into one texture maybe better
  {{#useMetallicTexture}}
    float metallic  = texture2D(metallicTexture, uv0).r;
  {{/useMetallicTexture}}
  {{#useRoughnessTexture}}
    float roughness = texture2D(roughnessTexture, uv0).r;
  {{/useRoughnessTexture}}
  {{#useAoTexture}}
    float ao        = texture2D(aoTexture, uv0).r;
  {{/useAoTexture}}

  vec3 N = normalize(normal_w);
  {{#useNormalTexture}}
    N = getNormalFromTexture();
  {{/useNormalTexture}}
  vec3 V = normalize(eye - pos_w);

  // calculate reflectance at normal incidence; if dia-electric (like plastic) use F0
  // of 0.04 and if it's a metal, use the albedo color as F0 (metallic workflow)
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metallic);

  // reflection
  vec3 Lo = vec3(0.0);

  // point light (a 'for' loop to accumulate all light sources)
  {{#pointLightSlots}}
    LightInfo pointLight;
    pointLight = computePointLighting(point_light{{id}}_position, pos_w, point_light{{id}}_color);
    Lo += brdf(pointLight, N, V, F0, albedo, roughness);
  {{/pointLightSlots}}

  // directional light (a 'for' loop to accumulate all light sources)
  {{#directionalLightSlots}}
    LightInfo directionalLight;
    directionalLight = computeDirectionalLighting(dir_light{{id}}_direction, dir_light{{id}}_color);
    Lo += brdf(directionalLight, N, V, F0, albedo, roughness);
  {{/directionalLightSlots}}

  // spot light (a 'for' loop to accumulate all light sources)
  {{#spotLightSlots}}
    LightInfo spotLight;
    spotLight = computeSpotLighting(spot_light{{id}}_position, pos_w, spot_light{{id}}_direction, spot_light{{id}}_color, spot_light{{id}}_spot);
    Lo += brdf(spotLight, N, V, F0, albedo, roughness);
  {{/spotLightSlots}}

  // ambient lighting, will be replaced by IBL later
  vec3 ambient = vec3(0.03) * albedo * ao;
  vec3 color = ambient + Lo;
  // HDR tone mapping
  color = color / (color + vec3(1.0));
  // gamma correction ?

  gl_FragColor = vec4(color, 1.0);
}
uniform float depthScale;
varying float vDepth;

#include <packing.frag>

void main() {
  // doing exp() here will cause float precision issue.
  //float depth = clamp(exp(-min(87.0, depthScale * vDepth)), 0.0, 1.0);
  gl_FragColor = packDepthToRGBA(vDepth);
  // TODO: if support float32 * 4 color buffer?
  //gl_FragColor = vec4(depth, 1.0, 1.0, 1.0);
}
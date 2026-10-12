/** Shared by every vertex shader: the palette, and the chaos-to-graph morph. */
const COMMON = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
uniform float uScale;
uniform float uFocus;
uniform vec3 uPalette[5];
uniform float uBoost[5];

float ease(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Each point leaves the cloud at its own moment, so the graph condenses
// instead of snapping into place.
vec3 morph(vec3 start, vec3 target, float delay) {
  float local = clamp(uProgress * 1.6 - delay * 0.6, 0.0, 1.0);
  float p = ease(local);
  vec3 wobble = vec3(
    sin(uTime * 0.7 + start.y * 1.7),
    cos(uTime * 0.6 + start.z * 1.3),
    sin(uTime * 0.8 + start.x * 1.9)
  );
  vec3 pos = mix(start + wobble * 0.9, target + wobble * 0.035, p);
  float angle = (1.0 - p) * 1.5 * (0.4 + delay);
  float c = cos(angle);
  float s = sin(angle);
  pos.xz = mat2(c, -s, s, c) * pos.xz;
  return pos;
}

// Fog measured from the point the camera is looking at, so the graph reads
// the same whether the camera is close in or pulled far back.
float depthFade(float depth) {
  return smoothstep(uFocus + 44.0, uFocus - 6.0, depth);
}
`;

export const dustVertex = /* glsl */ `
${COMMON}
attribute vec3 aStart;
attribute float aCluster;
attribute float aSize;
attribute float aDelay;
varying vec3 vColor;
varying float vAlpha;

void main() {
  int ci = int(aCluster + 0.5);
  vec4 mv = modelViewMatrix * vec4(morph(aStart, position, aDelay), 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  // Capped so a stray point drifting past the camera never becomes a blob.
  gl_PointSize = clamp(aSize * uScale * uPixelRatio / depth, 1.3 * uPixelRatio, 6.0 * uPixelRatio);
  float twinkle = 0.78 + 0.22 * sin(uTime * 1.4 + aDelay * 43.0);
  vAlpha = twinkle * depthFade(depth) * mix(0.45, 1.0, uBoost[ci]);
  vColor = uPalette[ci];
}
`;

export const dustFragment = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vColor, smoothstep(0.5, 0.08, d) * vAlpha * uOpacity);
}
`;

export const nodeVertex = /* glsl */ `
${COMMON}
uniform float uHover;
uniform float uSizeMul;
attribute vec3 aStart;
attribute float aCluster;
attribute float aSize;
attribute float aDelay;
attribute float aIndex;
varying vec3 vColor;
varying float vAlpha;

void main() {
  int ci = int(aCluster + 0.5);
  vec4 mv = modelViewMatrix * vec4(morph(aStart, position, aDelay), 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  float hovered = 1.0 - step(0.5, abs(aIndex - uHover));
  float breathe = 1.0 + 0.05 * sin(uTime * 1.3 + aIndex * 1.9);
  float size = aSize * uSizeMul * breathe * (1.0 + hovered * 0.45);
  gl_PointSize = max(size * uScale * uPixelRatio / depth, 3.0 * uPixelRatio);
  vAlpha = depthFade(depth) * max(mix(0.34, 1.0, uBoost[ci]), hovered);
  vColor = uPalette[ci];
}
`;

/** Each node is a flat point shaded as a lit sphere. */
export const nodeFragment = /* glsl */ `
uniform float uSpecular;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = (gl_PointCoord - 0.5) * 2.0;
  float r2 = dot(uv, uv);
  if (r2 > 1.0) discard;
  vec3 normal = vec3(uv.x, -uv.y, sqrt(1.0 - r2));
  vec3 light = normalize(vec3(-0.45, 0.6, 0.7));
  float diffuse = max(dot(normal, light), 0.0);
  float specular = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
  vec3 color = vColor * (0.42 + 0.7 * diffuse) + vec3(specular * uSpecular);
  gl_FragColor = vec4(color, smoothstep(1.0, 0.84, r2) * vAlpha);
}
`;

export const haloFragment = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  gl_FragColor = vec4(vColor, pow(1.0 - d, 2.4) * vAlpha * uOpacity);
}
`;

export const edgeVertex = /* glsl */ `
${COMMON}
attribute float aCluster;
attribute float aT;
varying vec3 vColor;
varying float vAlpha;
varying float vT;

void main() {
  int ci = int(aCluster + 0.5);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vAlpha = depthFade(-mv.z) * mix(0.3, 1.0, uBoost[ci]);
  vColor = uPalette[ci];
  vT = aT;
}
`;

/** Edges draw themselves outward from their source as uReveal rises. */
export const edgeFragment = /* glsl */ `
uniform float uOpacity;
uniform float uReveal;
varying vec3 vColor;
varying float vAlpha;
varying float vT;

void main() {
  if (vT > uReveal) discard;
  gl_FragColor = vec4(vColor, vAlpha * uOpacity);
}
`;

/** A pulse is an event travelling along one edge. */
export const pulseVertex = /* glsl */ `
${COMMON}
attribute vec3 aTo;
attribute float aCluster;
attribute float aPhase;
attribute float aSpeed;
varying vec3 vColor;
varying float vAlpha;

void main() {
  int ci = int(aCluster + 0.5);
  float t = fract(uTime * aSpeed + aPhase);
  vec4 mv = modelViewMatrix * vec4(mix(position, aTo, t), 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = -mv.z;
  gl_PointSize = max(0.34 * uScale * uPixelRatio / depth, 2.5 * uPixelRatio);
  vAlpha = sin(t * 3.14159265) * depthFade(depth) * mix(0.25, 1.0, uBoost[ci]);
  vColor = uPalette[ci];
}
`;

export const pulseFragment = /* glsl */ `
uniform float uOpacity;
uniform float uWhite;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.42, 0.0, d);
  float glow = pow(1.0 - d, 2.0);
  vec3 color = mix(vColor, vec3(1.0), core * uWhite);
  gl_FragColor = vec4(color, (core + glow * 0.55) * vAlpha * uOpacity);
}
`;

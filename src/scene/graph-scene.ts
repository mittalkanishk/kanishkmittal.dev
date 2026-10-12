import {
  AdditiveBlending,
  Group,
  LineSegments,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
  type IUniform,
} from 'three';
import { GRAPH_EDGES, GRAPH_NODES } from '../data/graph';
import type { ClusterId, GraphNode } from '../data/types';
import { buildDustGeometry, buildEdgeGeometry, buildNodeGeometry, buildPulseGeometry, nodeSize } from './builders';
import { CLUSTER_INDEX, layoutNodes, mulberry32, type Vec3 } from './layout';
import { SCENE_PALETTES, type ScenePalette, type SceneTheme } from './palette';
import * as shaders from './shaders';

const FOV = 40;

/** Intro timeline in milliseconds. */
const INTRO = { hold: 900, morph: 3600, edges: 1600, pulses: 900 } as const;

export interface GraphSceneOptions {
  canvas: HTMLCanvasElement;
  theme: SceneTheme;
  reducedMotion: boolean;
  compact: boolean;
}

export interface ProjectedNode {
  x: number;
  y: number;
  /** Radius of the node sphere on screen, in CSS pixels. */
  radius: number;
  visible: boolean;
}

type Uniforms = Record<string, IUniform>;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

function hexToVector(hex: string): Vector3 {
  const value = Number.parseInt(hex.slice(1), 16);
  return new Vector3(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

export class GraphScene {
  readonly nodes: GraphNode[] = GRAPH_NODES;
  readonly positions: Map<string, Vec3> = layoutNodes(GRAPH_NODES);

  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 240);
  private readonly root = new Group();
  private readonly shared: Uniforms;
  private readonly dust: ShaderMaterial;
  private readonly edges: ShaderMaterial;
  private readonly halos: ShaderMaterial;
  private readonly spheres: ShaderMaterial;
  private readonly pulses: ShaderMaterial;
  private readonly nodeTargets: Vector3[];
  private readonly nodeRadii: number[];
  private readonly scratch = new Vector3();
  private readonly reducedMotion: boolean;
  private readonly maxPixelRatio: number;

  private palette: ScenePalette;
  private width = 1;
  private height = 1;
  private introStart = -1;
  private lastFrame = -1;
  private progress = 0;

  private readonly camPos = new Vector3(0, 0, 39);
  private readonly camLook = new Vector3();
  private readonly goalPos = new Vector3(0, 0, 39);
  private readonly goalLook = new Vector3();
  private shift = 0;
  private goalShift = 0;
  private rise = 0;
  private goalRise = 0;
  private snapCamera = true;

  private readonly boostGoal = [1, 1, 1, 1, 1];
  private pointerX = 0;
  private pointerY = 0;
  private swayX = 0;
  private swayY = 0;

  constructor(options: GraphSceneOptions) {
    this.reducedMotion = options.reducedMotion;
    this.maxPixelRatio = options.compact ? 1.75 : 2;
    this.palette = SCENE_PALETTES[options.theme];

    this.renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);

    this.shared = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPixelRatio: { value: 1 },
      uScale: { value: 1 },
      uFocus: { value: 39 },
      uPalette: { value: this.palette.clusters.map(hexToVector) },
      uBoost: { value: [1, 1, 1, 1, 1] },
    };

    const random = mulberry32(41);
    const dustCount = options.compact ? 1500 : 3400;
    const pulseCount = options.compact ? 26 : 54;

    this.dust = this.material(shaders.dustVertex, shaders.dustFragment, { uOpacity: { value: 0 } });
    this.edges = this.material(shaders.edgeVertex, shaders.edgeFragment, {
      uOpacity: { value: 0 },
      uReveal: { value: 0 },
    });
    this.halos = this.material(shaders.nodeVertex, shaders.haloFragment, {
      uOpacity: { value: 0 },
      uHover: { value: -1 },
      uSizeMul: { value: 4.2 },
    });
    this.spheres = this.material(shaders.nodeVertex, shaders.nodeFragment, {
      uSpecular: { value: 0 },
      uHover: { value: -1 },
      uSizeMul: { value: 1 },
    });
    this.spheres.depthWrite = true;
    this.pulses = this.material(shaders.pulseVertex, shaders.pulseFragment, {
      uOpacity: { value: 0 },
      uWhite: { value: 0 },
    });

    const nodeGeometry = buildNodeGeometry(this.nodes, this.positions, random);
    const layers = [
      new LineSegments(buildEdgeGeometry(this.nodes, GRAPH_EDGES, this.positions), this.edges),
      new Points(buildDustGeometry(dustCount, this.nodes, GRAPH_EDGES, this.positions), this.dust),
      new Points(nodeGeometry, this.halos),
      new Points(nodeGeometry, this.spheres),
      new Points(buildPulseGeometry(pulseCount, this.nodes, GRAPH_EDGES, this.positions, random), this.pulses),
    ];
    layers.forEach((layer, order) => {
      // Points are placed in the vertex shader, so their bounds mean nothing.
      layer.frustumCulled = false;
      layer.renderOrder = order;
      this.root.add(layer);
    });
    this.scene.add(this.root);

    this.nodeTargets = this.nodes.map((node) => new Vector3(...this.positions.get(node.id)!));
    this.nodeRadii = this.nodes.map((node) => nodeSize(node) / 2);
    this.applyPalette();
  }

  private material(vertexShader: string, fragmentShader: string, uniforms: Uniforms): ShaderMaterial {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { ...this.shared, ...uniforms },
      transparent: true,
      depthWrite: false,
    });
  }

  private applyPalette(): void {
    const palette = this.palette;
    this.shared.uPalette!.value = palette.clusters.map(hexToVector);

    const blending = palette.additive ? AdditiveBlending : NormalBlending;
    for (const material of [this.dust, this.edges, this.halos, this.pulses]) {
      material.blending = blending;
      material.needsUpdate = true;
    }

    this.dust.uniforms.uOpacity!.value = palette.dust;
    this.edges.uniforms.uOpacity!.value = palette.edge;
    this.halos.uniforms.uOpacity!.value = palette.halo;
    this.spheres.uniforms.uSpecular!.value = palette.specular;
    this.pulses.uniforms.uWhite!.value = palette.pulseWhite;
  }

  setTheme(theme: SceneTheme): void {
    this.palette = SCENE_PALETTES[theme];
    this.applyPalette();
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.shared.uPixelRatio!.value = pixelRatio;
    // Converts a size in world units into CSS pixels at distance 1.
    this.shared.uScale!.value = this.height / (2 * Math.tan((FOV * Math.PI) / 360));
  }

  setCameraGoal(pos: Vec3, look: Vec3, shift: number, rise: number, snap = false): void {
    this.goalPos.set(...pos);
    this.goalLook.set(...look);
    this.goalShift = shift;
    this.goalRise = rise;
    if (snap) this.snapCamera = true;
  }

  /** Lights one cluster and dims the others. `null` lights everything. */
  setActiveCluster(cluster: ClusterId | null): void {
    const active = cluster === null ? -1 : CLUSTER_INDEX[cluster];
    for (let i = 0; i < this.boostGoal.length; i += 1) {
      this.boostGoal[i] = active === -1 ? 0.82 : i === active ? 1 : 0.16;
    }
    // The centre node and the far backdrop never dim all the way.
    this.boostGoal[0] = Math.max(this.boostGoal[0]!, 0.5);
  }

  /** Pointer position in the range -1 to 1 on both axes. */
  setPointer(x: number, y: number): void {
    this.pointerX = x;
    this.pointerY = y;
  }

  setHover(index: number): void {
    this.halos.uniforms.uHover!.value = index;
    this.spheres.uniforms.uHover!.value = index;
  }

  /** True once the graph has formed and labels can be shown. */
  get settled(): boolean {
    return this.progress > 0.9;
  }

  render(now: number): void {
    if (this.introStart < 0) this.introStart = now;
    const dt = this.lastFrame < 0 ? 0 : Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    const elapsed = now - this.introStart - INTRO.hold;
    const still = this.reducedMotion;
    this.progress = still ? 1 : clamp01(elapsed / INTRO.morph);
    const reveal = still ? 1 : easeInOut(clamp01((elapsed - INTRO.morph * 0.6) / INTRO.edges));
    const pulse = still ? 0 : clamp01((elapsed - INTRO.morph) / INTRO.pulses);

    if (!still) this.shared.uTime!.value += dt;
    this.shared.uProgress!.value = this.progress;
    this.edges.uniforms.uReveal!.value = reveal;
    this.pulses.uniforms.uOpacity!.value = this.palette.pulse * pulse;

    const ease = still || this.snapCamera ? 1 : 1 - Math.exp(-dt * 2.4);
    this.snapCamera = false;
    this.camPos.lerp(this.goalPos, ease);
    this.camLook.lerp(this.goalLook, ease);
    this.shift += (this.goalShift - this.shift) * ease;
    this.rise += (this.goalRise - this.rise) * ease;

    const boost = this.shared.uBoost!.value as number[];
    const fade = still ? 1 : 1 - Math.exp(-dt * 3.5);
    for (let i = 0; i < boost.length; i += 1) {
      boost[i] = boost[i]! + (this.boostGoal[i]! - boost[i]!) * fade;
    }

    // The graph drifts, leans toward the pointer, and spins while it forms.
    const time = this.shared.uTime!.value as number;
    const follow = still ? 0 : 1 - Math.exp(-dt * 2);
    this.swayX += (this.pointerX * 0.13 - this.swayX) * follow;
    this.swayY += (this.pointerY * 0.07 - this.swayY) * follow;
    const forming = 1 - easeInOut(this.progress);
    this.root.rotation.y = Math.sin(time * 0.11) * 0.15 + this.swayX + forming * 0.9;
    this.root.rotation.x = Math.sin(time * 0.09 + 1.3) * 0.045 + this.swayY;

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.shared.uFocus!.value = this.camPos.distanceTo(this.camLook);
    this.camera.setViewOffset(
      this.width,
      this.height,
      -this.shift * this.width,
      this.rise * this.height,
      this.width,
      this.height,
    );

    this.renderer.render(this.scene, this.camera);
  }

  /** Screen position and size of every node, in CSS pixels. Call after `render`. */
  projectNodes(out: ProjectedNode[]): void {
    const scale = this.shared.uScale!.value as number;
    for (let i = 0; i < this.nodeTargets.length; i += 1) {
      const point = this.scratch
        .copy(this.nodeTargets[i]!)
        .applyMatrix4(this.root.matrixWorld)
        .applyMatrix4(this.camera.matrixWorldInverse);
      const depth = -point.z;
      point.applyMatrix4(this.camera.projectionMatrix);

      const entry = out[i] ?? (out[i] = { x: 0, y: 0, radius: 0, visible: false });
      entry.x = (point.x * 0.5 + 0.5) * this.width;
      entry.y = (-point.y * 0.5 + 0.5) * this.height;
      entry.radius = depth > 0 ? Math.max(1.5, (this.nodeRadii[i]! * scale) / depth) : 0;
      entry.visible = depth > 0.1 && Math.abs(point.x) < 1.05 && Math.abs(point.y) < 1.05;
    }
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof Points || object instanceof LineSegments) object.geometry.dispose();
    });
    for (const material of [this.dust, this.edges, this.halos, this.spheres, this.pulses]) material.dispose();
    this.renderer.dispose();
  }
}

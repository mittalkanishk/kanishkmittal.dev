import type { ClusterId, GraphEdge, GraphNode } from '../data/types';

export type Vec3 = [number, number, number];

export const CLUSTER_ORDER: ClusterId[] = ['core', 'experience', 'projects', 'skills', 'education'];

export const CLUSTER_INDEX: Record<ClusterId, number> = {
  core: 0,
  experience: 1,
  projects: 2,
  skills: 3,
  education: 4,
};

export const CLUSTER_CENTERS: Record<ClusterId, Vec3> = {
  core: [0, 0, 0],
  experience: [-7.4, 2.4, 0.6],
  projects: [6.8, 3.2, -1.6],
  skills: [1.2, -5.6, 3.2],
  education: [-1.6, 6.4, -5.4],
};

/** Small deterministic PRNG, so the graph looks the same on every visit. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Point `index` of `count` spread evenly over a unit sphere. */
export function fibonacciSphere(index: number, count: number): Vec3 {
  if (count <= 1) return [0, 1, 0];
  const golden = Math.PI * (Math.sqrt(5) - 1);
  const y = 1 - (index / (count - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * index;
  return [Math.cos(theta) * radius, y, Math.sin(theta) * radius];
}

function orbitRadius(childCount: number): number {
  return Math.min(4.6, 2.1 + childCount * 0.16);
}

/** Hubs sit at their cluster centre; the rest orbit their hub on a sphere. */
export function layoutNodes(nodes: GraphNode[], seed = 11): Map<string, Vec3> {
  const random = mulberry32(seed);
  const positions = new Map<string, Vec3>();

  for (const cluster of CLUSTER_ORDER) {
    const center = CLUSTER_CENTERS[cluster];
    const members = nodes.filter((node) => node.cluster === cluster);
    const children = members.filter((node) => !node.hub);
    const radius = orbitRadius(children.length);

    for (const hub of members.filter((node) => node.hub)) {
      positions.set(hub.id, [center[0], center[1], center[2]]);
    }

    children.forEach((node, index) => {
      const [dx, dy, dz] = fibonacciSphere(index, children.length);
      const reach = radius * (0.86 + random() * 0.28);
      positions.set(node.id, [
        center[0] + dx * reach,
        center[1] + dy * reach * 0.82,
        center[2] + dz * reach,
      ]);
    });
  }

  return positions;
}

export interface DustBuffers {
  /** Where each point starts: a shapeless cloud. */
  start: Float32Array;
  /** Where each point settles: along edges, around nodes, or far behind. */
  target: Float32Array;
  cluster: Float32Array;
  size: Float32Array;
  delay: Float32Array;
}

const CHAOS_RADIUS = 13;

function randomInSphere(random: () => number, radius: number): Vec3 {
  const u = random() * 2 - 1;
  const theta = random() * Math.PI * 2;
  const r = Math.cbrt(random()) * radius;
  const s = Math.sqrt(1 - u * u);
  return [r * s * Math.cos(theta), r * u, r * s * Math.sin(theta)];
}

function requirePosition(positions: Map<string, Vec3>, id: string): Vec3 {
  const position = positions.get(id);
  if (!position) throw new Error(`no position for node ${id}`);
  return position;
}

export function chaosPosition(random: () => number): Vec3 {
  return randomInSphere(random, CHAOS_RADIUS);
}

/**
 * The loose points that make up most of the picture. Half trace the edges,
 * a third gather around nodes, and the rest stay behind as a far backdrop.
 */
export function buildDust(
  count: number,
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Map<string, Vec3>,
  seed = 23,
): DustBuffers {
  const random = mulberry32(seed);
  const clusterOf = new Map(nodes.map((node) => [node.id, node.cluster]));
  const buffers: DustBuffers = {
    start: new Float32Array(count * 3),
    target: new Float32Array(count * 3),
    cluster: new Float32Array(count),
    size: new Float32Array(count),
    delay: new Float32Array(count),
  };

  for (let i = 0; i < count; i += 1) {
    const roll = random();
    let target: Vec3;
    let cluster: ClusterId;
    let size: number;

    if (roll < 0.5) {
      const edge = edges[Math.floor(random() * edges.length)]!;
      const from = requirePosition(positions, edge.from);
      const to = requirePosition(positions, edge.to);
      const t = random();
      const jitter = randomInSphere(random, 0.16);
      target = [
        from[0] + (to[0] - from[0]) * t + jitter[0],
        from[1] + (to[1] - from[1]) * t + jitter[1],
        from[2] + (to[2] - from[2]) * t + jitter[2],
      ];
      cluster = clusterOf.get(t < 0.5 ? edge.from : edge.to) ?? 'core';
      size = 0.05 + random() * 0.05;
    } else if (roll < 0.84) {
      const node = nodes[Math.floor(random() * nodes.length)]!;
      const center = requirePosition(positions, node.id);
      const halo = randomInSphere(random, node.hub ? 1.5 : 0.8);
      target = [center[0] + halo[0], center[1] + halo[1], center[2] + halo[2]];
      cluster = node.cluster;
      size = 0.05 + random() * 0.08;
    } else {
      const direction = randomInSphere(random, 1);
      const length = Math.hypot(direction[0], direction[1], direction[2]) || 1;
      const distance = 17 + random() * 17;
      target = [
        (direction[0] / length) * distance,
        (direction[1] / length) * distance,
        (direction[2] / length) * distance,
      ];
      cluster = 'core';
      size = 0.07 + random() * 0.1;
    }

    const start = chaosPosition(random);
    buffers.start.set(start, i * 3);
    buffers.target.set(target, i * 3);
    buffers.cluster[i] = CLUSTER_INDEX[cluster];
    buffers.size[i] = size;
    buffers.delay[i] = random();
  }

  return buffers;
}

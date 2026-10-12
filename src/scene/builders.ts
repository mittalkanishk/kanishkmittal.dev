import { BufferAttribute, BufferGeometry } from 'three';
import type { GraphEdge, GraphNode } from '../data/types';
import { CLUSTER_INDEX, buildDust, chaosPosition, type Vec3 } from './layout';

function attribute(values: number[] | Float32Array, itemSize: number): BufferAttribute {
  return new BufferAttribute(values instanceof Float32Array ? values : new Float32Array(values), itemSize);
}

function positionOf(positions: Map<string, Vec3>, id: string): Vec3 {
  const position = positions.get(id);
  if (!position) throw new Error(`no position for node ${id}`);
  return position;
}

/** Diameter of a node sphere in world units. */
export function nodeSize(node: GraphNode): number {
  if (node.cluster === 'core') return 0.78;
  return node.hub ? 0.6 : 0.3;
}

export function buildDustGeometry(
  count: number,
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Map<string, Vec3>,
): BufferGeometry {
  const dust = buildDust(count, nodes, edges, positions);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute(dust.target, 3));
  geometry.setAttribute('aStart', attribute(dust.start, 3));
  geometry.setAttribute('aCluster', attribute(dust.cluster, 1));
  geometry.setAttribute('aSize', attribute(dust.size, 1));
  geometry.setAttribute('aDelay', attribute(dust.delay, 1));
  return geometry;
}

export function buildNodeGeometry(
  nodes: GraphNode[],
  positions: Map<string, Vec3>,
  random: () => number,
): BufferGeometry {
  const target: number[] = [];
  const start: number[] = [];
  const cluster: number[] = [];
  const size: number[] = [];
  const delay: number[] = [];
  const index: number[] = [];

  nodes.forEach((node, i) => {
    target.push(...positionOf(positions, node.id));
    start.push(...chaosPosition(random));
    cluster.push(CLUSTER_INDEX[node.cluster]);
    size.push(nodeSize(node));
    delay.push(node.hub ? random() * 0.3 : 0.3 + random() * 0.6);
    index.push(i);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute(target, 3));
  geometry.setAttribute('aStart', attribute(start, 3));
  geometry.setAttribute('aCluster', attribute(cluster, 1));
  geometry.setAttribute('aSize', attribute(size, 1));
  geometry.setAttribute('aDelay', attribute(delay, 1));
  geometry.setAttribute('aIndex', attribute(index, 1));
  return geometry;
}

/** Two vertices per edge, each tinted by the cluster at its own end. */
export function buildEdgeGeometry(
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Map<string, Vec3>,
): BufferGeometry {
  const clusterOf = new Map(nodes.map((node) => [node.id, CLUSTER_INDEX[node.cluster]]));
  const position: number[] = [];
  const cluster: number[] = [];
  const t: number[] = [];

  for (const edge of edges) {
    position.push(...positionOf(positions, edge.from), ...positionOf(positions, edge.to));
    cluster.push(clusterOf.get(edge.from) ?? 0, clusterOf.get(edge.to) ?? 0);
    t.push(0, 1);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute(position, 3));
  geometry.setAttribute('aCluster', attribute(cluster, 1));
  geometry.setAttribute('aT', attribute(t, 1));
  return geometry;
}

/** Pulses run along random edges in either direction at a steady world speed. */
export function buildPulseGeometry(
  count: number,
  nodes: GraphNode[],
  edges: GraphEdge[],
  positions: Map<string, Vec3>,
  random: () => number,
): BufferGeometry {
  const clusterOf = new Map(nodes.map((node) => [node.id, CLUSTER_INDEX[node.cluster]]));
  const from: number[] = [];
  const to: number[] = [];
  const cluster: number[] = [];
  const phase: number[] = [];
  const speed: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const edge = edges[Math.floor(random() * edges.length)]!;
    const reversed = random() < 0.5;
    const sourceId = reversed ? edge.to : edge.from;
    const targetId = reversed ? edge.from : edge.to;
    const source = positionOf(positions, sourceId);
    const target = positionOf(positions, targetId);
    const length = Math.hypot(target[0] - source[0], target[1] - source[1], target[2] - source[2]) || 1;

    from.push(...source);
    to.push(...target);
    cluster.push(clusterOf.get(sourceId) ?? 0);
    phase.push(random());
    speed.push((1.1 + random() * 1.3) / length);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', attribute(from, 3));
  geometry.setAttribute('aTo', attribute(to, 3));
  geometry.setAttribute('aCluster', attribute(cluster, 1));
  geometry.setAttribute('aPhase', attribute(phase, 1));
  geometry.setAttribute('aSpeed', attribute(speed, 1));
  return geometry;
}

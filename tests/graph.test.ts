import { describe, expect, it } from 'vitest';
import { GRAPH_EDGES, GRAPH_NODES } from '../src/data/graph';
import { CLUSTER_ORDER } from '../src/scene/layout';
import { STOPS } from '../src/scene/waypoints';

describe('graph data', () => {
  const ids = GRAPH_NODES.map((node) => node.id);

  it('has unique node ids', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly one hub per cluster', () => {
    for (const cluster of CLUSTER_ORDER) {
      const hubs = GRAPH_NODES.filter((node) => node.cluster === cluster && node.hub);
      expect(hubs, cluster).toHaveLength(1);
    }
  });

  it('only connects nodes that exist', () => {
    for (const edge of GRAPH_EDGES) {
      expect(ids, `${edge.from} -> ${edge.to}`).toContain(edge.from);
      expect(ids, `${edge.from} -> ${edge.to}`).toContain(edge.to);
      expect(edge.from).not.toBe(edge.to);
    }
  });

  it('has no duplicate edges in either direction', () => {
    const seen = new Set<string>();
    for (const edge of GRAPH_EDGES) {
      const key = [edge.from, edge.to].sort().join('|');
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('leaves no node unconnected', () => {
    const connected = new Set(GRAPH_EDGES.flatMap((edge) => [edge.from, edge.to]));
    for (const id of ids) expect(connected.has(id), id).toBe(true);
  });

  it('sends every node to a section that has a camera stop', () => {
    const sections = new Set(STOPS.map((stop) => stop.section));
    for (const node of GRAPH_NODES) expect(sections.has(node.section), node.id).toBe(true);
  });
});

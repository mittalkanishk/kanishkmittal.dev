import { describe, expect, it } from 'vitest';
import { GRAPH_EDGES, GRAPH_NODES } from '../src/data/graph';
import {
  CLUSTER_CENTERS,
  buildDust,
  fibonacciSphere,
  layoutNodes,
  mulberry32,
  type Vec3,
} from '../src/scene/layout';

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

describe('mulberry32', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays inside [0, 1)', () => {
    const random = mulberry32(99);
    for (let i = 0; i < 500; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('fibonacciSphere', () => {
  it('returns unit vectors', () => {
    for (let i = 0; i < 12; i += 1) {
      const [x, y, z] = fibonacciSphere(i, 12);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
    }
  });

  it('handles a single point', () => {
    expect(fibonacciSphere(0, 1)).toEqual([0, 1, 0]);
  });
});

describe('layoutNodes', () => {
  const positions = layoutNodes(GRAPH_NODES);

  it('places every node', () => {
    for (const node of GRAPH_NODES) expect(positions.has(node.id), node.id).toBe(true);
  });

  it('is deterministic', () => {
    expect([...layoutNodes(GRAPH_NODES)]).toEqual([...positions]);
  });

  it('puts each hub at its cluster centre', () => {
    for (const hub of GRAPH_NODES.filter((node) => node.hub)) {
      expect(positions.get(hub.id)).toEqual(CLUSTER_CENTERS[hub.cluster]);
    }
  });

  it('keeps nodes apart so labels stay readable', () => {
    const entries = [...positions];
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const gap = distance(entries[i]![1], entries[j]![1]);
        expect(gap, `${entries[i]![0]} / ${entries[j]![0]}`).toBeGreaterThan(0.9);
      }
    }
  });
});

describe('buildDust', () => {
  const positions = layoutNodes(GRAPH_NODES);
  const dust = buildDust(600, GRAPH_NODES, GRAPH_EDGES, positions);

  it('fills every buffer for every point', () => {
    expect(dust.start).toHaveLength(1800);
    expect(dust.target).toHaveLength(1800);
    expect(dust.cluster).toHaveLength(600);
    expect(dust.size).toHaveLength(600);
    expect(dust.delay).toHaveLength(600);
  });

  it('produces only finite numbers', () => {
    for (const buffer of [dust.start, dust.target, dust.cluster, dust.size, dust.delay]) {
      expect(buffer.every((value) => Number.isFinite(value))).toBe(true);
    }
  });

  it('uses a valid cluster index and a positive size', () => {
    expect(dust.cluster.every((value) => value >= 0 && value <= 4)).toBe(true);
    expect(dust.size.every((value) => value > 0)).toBe(true);
  });

  it('is deterministic', () => {
    const again = buildDust(600, GRAPH_NODES, GRAPH_EDGES, positions);
    expect(Array.from(again.target)).toEqual(Array.from(dust.target));
  });
});

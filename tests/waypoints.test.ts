import { describe, expect, it } from 'vitest';
import { GRAPH_NODES } from '../src/data/graph';
import { CLUSTER_CENTERS, layoutNodes } from '../src/scene/layout';
import { STOPS, lerpVec3, pullBack, resolveStops, sampleStops, smoothstep } from '../src/scene/waypoints';

describe('smoothstep', () => {
  it('clamps outside the range and eases inside it', () => {
    expect(smoothstep(0, 10, -5)).toBe(0);
    expect(smoothstep(0, 10, 15)).toBe(1);
    expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5, 5);
  });

  it('degrades to a step when the range is empty', () => {
    expect(smoothstep(4, 4, 3)).toBe(0);
    expect(smoothstep(4, 4, 4)).toBe(1);
  });
});

describe('sampleStops', () => {
  const anchors = [0, 1000, 3000];

  it('rests on the first stop before any scrolling', () => {
    expect(sampleStops(anchors, -50, 400)).toEqual({ index: 0, blend: 0 });
    expect(sampleStops(anchors, 0, 400)).toEqual({ index: 0, blend: 0 });
  });

  it('holds a stop until the travel window opens', () => {
    expect(sampleStops(anchors, 1200, 400)).toEqual({ index: 1, blend: 0 });
    expect(sampleStops(anchors, 2600, 400)).toEqual({ index: 1, blend: 0 });
  });

  it('eases toward the next stop inside the travel window', () => {
    const sample = sampleStops(anchors, 2800, 400);
    expect(sample.index).toBe(1);
    expect(sample.blend).toBeCloseTo(0.5, 5);
  });

  it('never starts travelling before the current anchor', () => {
    const sample = sampleStops([0, 300], 150, 900);
    expect(sample.index).toBe(0);
    expect(sample.blend).toBeCloseTo(0.5, 5);
  });

  it('rests on the last stop past the end', () => {
    expect(sampleStops(anchors, 9000, 400)).toEqual({ index: 2, blend: 0 });
  });

  it('copes with an empty list', () => {
    expect(sampleStops([], 100, 400)).toEqual({ index: 0, blend: 0 });
  });
});

describe('pullBack', () => {
  it('leaves the design aspect ratio and anything wider alone', () => {
    expect(pullBack({ compact: false, aspect: 1.6 })).toBe(1);
    expect(pullBack({ compact: false, aspect: 2.4 })).toBe(1);
  });

  it('pulls back in proportion on narrower windows', () => {
    expect(pullBack({ compact: false, aspect: 1.28 })).toBeCloseTo(1.25, 5);
  });

  it('uses a fixed distance on compact screens', () => {
    expect(pullBack({ compact: true, aspect: 0.46 })).toBe(1.55);
  });
});

describe('resolveStops', () => {
  const positions = layoutNodes(GRAPH_NODES);
  const desktop = { compact: false, aspect: 1.6 };
  const phone = { compact: true, aspect: 0.46 };

  it('aims cluster stops at the cluster centre', () => {
    const stops = resolveStops(STOPS, positions, desktop);
    const skills = stops.find((stop) => stop.section === 'skills');
    expect(skills?.look).toEqual(CLUSTER_CENTERS.skills);
  });

  it('aims node stops at the node', () => {
    const stops = resolveStops(STOPS, positions, desktop);
    const agents = stops.find((stop) => stop.section === 'agents');
    expect(agents?.look).toEqual(positions.get('steerloop'));
  });

  it('centres the picture and pulls back on narrow screens', () => {
    const wide = resolveStops(STOPS, positions, desktop);
    const narrow = resolveStops(STOPS, positions, phone);
    expect(narrow.every((stop) => stop.shift === 0)).toBe(true);
    expect(narrow[0]!.pos[2]).toBeGreaterThan(wide[0]!.pos[2]);
  });

  it('lifts the picture above the text on narrow screens only', () => {
    expect(resolveStops(STOPS, positions, desktop).every((stop) => stop.rise === 0)).toBe(true);
    const narrow = resolveStops(STOPS, positions, phone);
    expect(narrow.find((stop) => stop.section === 'top')?.rise).toBeGreaterThan(0);
    expect(narrow.find((stop) => stop.section === 'experience')?.rise).toBeGreaterThan(0);
  });
});

describe('lerpVec3', () => {
  it('interpolates each component', () => {
    expect(lerpVec3([0, 0, 0], [2, 4, 6], 0.5)).toEqual([1, 2, 3]);
  });
});

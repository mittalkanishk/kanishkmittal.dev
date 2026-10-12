import type { ClusterId, SectionId } from '../data/types';
import { CLUSTER_CENTERS, type Vec3 } from './layout';

type Focus = { kind: 'point'; at: Vec3 } | { kind: 'cluster'; id: ClusterId } | { kind: 'node'; id: string };

/** Where the camera rests while a section is on screen. */
export interface StopSpec {
  section: SectionId;
  focus: Focus;
  /** Camera position relative to the focus point. */
  offset: Vec3;
  /** Horizontal shift of the picture, as a fraction of the viewport width. */
  shift: number;
  /** Cluster that is lit while this stop is active. */
  active: ClusterId | null;
  /** Camera offset on narrow screens, when the scaled default does not frame well. */
  compactOffset?: Vec3;
  /** Vertical placement on narrow screens, when the default band is taken by text. */
  compactRise?: number;
}

export interface ResolvedStop {
  section: SectionId;
  pos: Vec3;
  look: Vec3;
  shift: number;
  /** Upward shift of the picture, as a fraction of the viewport height. */
  rise: number;
  active: ClusterId | null;
}

export const STOPS: StopSpec[] = [
  { section: 'top', focus: { kind: 'point', at: [-0.5, -0.4, 0] }, offset: [0, 1.2, 39], shift: 0.265, active: null, compactOffset: [0, 1.2, 68] },
  { section: 'proof', focus: { kind: 'point', at: [0, 0.4, 0] }, offset: [-5, 3.5, 23], shift: 0, active: null, compactRise: -0.14 },
  { section: 'experience', focus: { kind: 'cluster', id: 'experience' }, offset: [-3.2, 1.2, 13.5], shift: 0.2, active: 'experience' },
  { section: 'projects', focus: { kind: 'cluster', id: 'projects' }, offset: [3.6, 0.8, 12.5], shift: 0.2, active: 'projects' },
  { section: 'agents', focus: { kind: 'node', id: 'steerloop' }, offset: [2.2, -0.6, 8.2], shift: 0.2, active: 'projects' },
  { section: 'skills', focus: { kind: 'cluster', id: 'skills' }, offset: [0.6, -1.8, 18.5], shift: 0.19, active: 'skills' },
  { section: 'education', focus: { kind: 'cluster', id: 'education' }, offset: [-3.4, 2.2, 12.5], shift: 0.2, active: 'education' },
  { section: 'contact', focus: { kind: 'point', at: [-0.5, -0.4, 0] }, offset: [0, 5, 42], shift: 0.24, active: null },
];

function focusPoint(focus: Focus, positions: Map<string, Vec3>): Vec3 {
  if (focus.kind === 'point') return focus.at;
  if (focus.kind === 'cluster') return CLUSTER_CENTERS[focus.id];
  const position = positions.get(focus.id);
  if (!position) throw new Error(`no position for node ${focus.id}`);
  return position;
}

export interface Viewport {
  /** Narrow screens put the text on top of the graph instead of beside it. */
  compact: boolean;
  /** Width divided by height. */
  aspect: number;
}

/** Stops are framed for this aspect ratio; narrower windows pull the camera back. */
const DESIGN_ASPECT = 1.6;
/** On narrow screens the graph sits in the open band above each heading. */
const COMPACT_RISE = 0.25;

export function pullBack(view: Viewport): number {
  if (view.compact) return 1.55;
  return Math.max(1, DESIGN_ASPECT / Math.max(view.aspect, 0.1));
}

export function resolveStops(specs: StopSpec[], positions: Map<string, Vec3>, view: Viewport): ResolvedStop[] {
  const scale = pullBack(view);
  return specs.map((spec) => {
    const look = focusPoint(spec.focus, positions);
    const offset: Vec3 =
      view.compact && spec.compactOffset
        ? spec.compactOffset
        : [spec.offset[0] * scale, spec.offset[1] * scale, spec.offset[2] * scale];
    return {
      section: spec.section,
      look,
      pos: [look[0] + offset[0], look[1] + offset[1], look[2] + offset[2]],
      shift: view.compact ? 0 : spec.shift,
      rise: view.compact ? (spec.compactRise ?? COMPACT_RISE) : 0,
      active: spec.active,
    };
  });
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface StopSample {
  index: number;
  /** 0 while resting on `index`, rising to 1 on the approach to the next stop. */
  blend: number;
}

/**
 * Maps a scroll position onto the stops. The camera rests on a stop for most
 * of its section and travels to the next one over the last `travel` pixels.
 */
export function sampleStops(anchors: number[], y: number, travel: number): StopSample {
  if (anchors.length === 0) return { index: 0, blend: 0 };

  let index = 0;
  for (let i = 0; i < anchors.length; i += 1) {
    if (anchors[i]! <= y) index = i;
  }
  if (index >= anchors.length - 1) return { index: anchors.length - 1, blend: 0 };

  const next = anchors[index + 1]!;
  const start = Math.max(anchors[index]!, next - travel);
  return { index, blend: smoothstep(start, next, y) };
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

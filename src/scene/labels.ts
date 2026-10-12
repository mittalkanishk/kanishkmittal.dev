import type { ClusterId, GraphNode } from '../data/types';
import type { ProjectedNode } from './graph-scene';

export interface LabelState {
  active: ClusterId | null;
  settled: boolean;
  hover: number;
  /** Narrow screens show only the cluster being read. */
  compact: boolean;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Gap between the edge of a node sphere and its label. */
const GAP = 7;
const HALF_HEIGHT = 11;

interface Anchor {
  x: number;
  y: number;
  radius: number;
}

/** True when a label drawn beside `point` would touch any of the boxes. */
export function isCovered(point: Anchor, width: number, boxes: Box[]): boolean {
  const left = point.x + point.radius + GAP;
  const right = left + width;
  const top = point.y - HALF_HEIGHT;
  const bottom = point.y + HALF_HEIGHT;
  return boxes.some((box) => left < box.right && right > box.left && top < box.bottom && bottom > box.top);
}

/** Text labels drawn as DOM elements, so they stay sharp at any zoom. */
export class GraphLabels {
  private readonly elements: HTMLElement[];
  private readonly opacity: number[];
  private widths: number[] = [];

  constructor(
    root: HTMLElement,
    private readonly nodes: GraphNode[],
  ) {
    root.replaceChildren();
    this.elements = nodes.map((node) => {
      const element = document.createElement('span');
      element.className = 'glabel';
      element.dataset.cluster = node.cluster;
      if (node.hub) element.dataset.hub = '';
      element.textContent = node.label;
      root.append(element);
      return element;
    });
    this.opacity = nodes.map(() => -1);
  }

  /** Label widths change with the font and the breakpoint. */
  measure(): void {
    this.widths = this.elements.map((element) => element.offsetWidth);
  }

  private targetOpacity(node: GraphNode, index: number, state: LabelState): number {
    if (state.hover === index) return 1;
    const lit = state.active === node.cluster;
    if (state.compact) {
      if (node.hub) return state.active === null ? 0.9 : lit ? 1 : 0;
      return lit ? 0.8 : 0;
    }
    if (node.hub) return state.active === null ? 0.95 : lit ? 1 : 0.3;
    return lit ? 0.86 : 0;
  }

  /** `blocked` lists the cards and headings a label must not sit behind. */
  update(points: ProjectedNode[], state: LabelState, blocked: Box[]): void {
    if (this.widths.length === 0) this.measure();

    for (let i = 0; i < this.elements.length; i += 1) {
      const element = this.elements[i]!;
      const point = points[i];
      if (!point) continue;

      const shown = state.settled && point.visible && !isCovered(point, this.widths[i] ?? 0, blocked);
      const opacity = shown ? this.targetOpacity(this.nodes[i]!, i, state) : 0;
      if (opacity !== this.opacity[i]) {
        this.opacity[i] = opacity;
        element.style.opacity = String(opacity);
      }
      element.classList.toggle('is-hover', state.hover === i);
      if (opacity > 0) {
        const x = point.x + point.radius + GAP;
        element.style.transform = `translate3d(${x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`;
      }
    }
  }
}

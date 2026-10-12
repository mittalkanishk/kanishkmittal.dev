import type { ClusterId } from '../data/types';
import type { GraphScene, ProjectedNode } from './graph-scene';
import { GraphLabels, type Box } from './labels';
import type { SceneTheme } from './palette';
import { STOPS, lerpVec3, resolveStops, sampleStops, type ResolvedStop, type Viewport } from './waypoints';

/** Elements that sit on top of the graph and should swallow hover and click. */
const SOLID = 'a, button, input, .panel, .site-header, pre';
/** Cards and headings. A graph label is hidden rather than drawn behind one. */
const OCCLUDERS = '.panel, .site-header, [data-nav], [data-clear]';
/** How close the pointer has to be to a node to pick it, in CSS pixels. */
const PICK_RADIUS = 24;

function supportsWebGL(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

function currentTheme(): SceneTheme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/**
 * Starts the graph behind the page. The page is complete without it, so any
 * failure here just leaves the plain background in place.
 */
export async function bootScene(): Promise<void> {
  const html = document.documentElement;
  const canvas = document.querySelector<HTMLCanvasElement>('#graph-canvas');
  const labelRoot = document.querySelector<HTMLElement>('#graph-labels');
  if (!canvas || !labelRoot) return;
  if (!supportsWebGL()) {
    html.classList.add('no-webgl');
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactQuery = window.matchMedia('(max-width: 900px)');

  let scene: GraphScene;
  try {
    const { GraphScene: Scene } = await import('./graph-scene');
    scene = new Scene({ canvas, theme: currentTheme(), reducedMotion, compact: compactQuery.matches });
  } catch {
    html.classList.add('no-webgl');
    return;
  }

  const viewport = (): Viewport => ({
    compact: compactQuery.matches,
    aspect: canvas.clientWidth / Math.max(1, canvas.clientHeight),
  });

  const labels = new GraphLabels(labelRoot, scene.nodes);
  const projected: ProjectedNode[] = [];
  let stops: ResolvedStop[] = resolveStops(STOPS, scene.positions, viewport());
  let anchors: number[] = [];
  let active: ClusterId | null = null;
  let hover = -1;
  let pointer: { x: number; y: number; free: boolean } | null = null;

  // Only occluders that are on screen are measured each frame.
  const onScreen = new Set<Element>();
  const blocked: Box[] = [];
  const occluderObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target);
      else onScreen.delete(entry.target);
    }
  });
  for (const element of document.querySelectorAll(OCCLUDERS)) occluderObserver.observe(element);

  const applyScroll = (snap = false): void => {
    const y = window.scrollY + window.innerHeight * 0.45;
    const { index, blend } = sampleStops(anchors, y, window.innerHeight * 0.85);
    const from = stops[index]!;
    const to = stops[Math.min(index + 1, stops.length - 1)]!;
    scene.setCameraGoal(
      lerpVec3(from.pos, to.pos, blend),
      lerpVec3(from.look, to.look, blend),
      from.shift + (to.shift - from.shift) * blend,
      from.rise + (to.rise - from.rise) * blend,
      snap,
    );
    active = blend < 0.5 ? from.active : to.active;
    scene.setActiveCluster(active);
  };

  const measure = (snap = false): void => {
    scene.resize(canvas.clientWidth, canvas.clientHeight);
    labels.measure();
    stops = resolveStops(STOPS, scene.positions, viewport());
    anchors = stops.map((stop, index) => {
      const section = document.getElementById(stop.section);
      return index === 0 || !section ? 0 : section.getBoundingClientRect().top + window.scrollY;
    });
    applyScroll(snap);
  };

  const pick = (): number => {
    if (!pointer || !pointer.free || !scene.settled) return -1;
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < projected.length; i += 1) {
      const point = projected[i]!;
      if (!point.visible) continue;
      const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
      if (distance < Math.max(PICK_RADIUS, point.radius + 8) && distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    return best;
  };

  let frame = 0;
  let ready = false;
  const tick = (now: number): void => {
    frame = window.requestAnimationFrame(tick);
    scene.render(now);
    scene.projectNodes(projected);

    const next = pick();
    if (next !== hover) {
      hover = next;
      scene.setHover(hover);
      html.classList.toggle('graph-hover', hover >= 0);
    }
    blocked.length = 0;
    for (const element of onScreen) blocked.push(element.getBoundingClientRect());
    labels.update(projected, { active, settled: scene.settled, hover, compact: compactQuery.matches }, blocked);

    if (!ready) {
      ready = true;
      html.classList.add('scene-ready');
    }
  };

  window.addEventListener('scroll', () => applyScroll(), { passive: true });

  let measureQueued = false;
  const queueMeasure = (): void => {
    if (measureQueued) return;
    measureQueued = true;
    window.requestAnimationFrame(() => {
      measureQueued = false;
      measure();
    });
  };
  window.addEventListener('resize', queueMeasure);
  new ResizeObserver(queueMeasure).observe(document.body);

  compactQuery.addEventListener('change', () => measure(true));

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch') return;
      const target = event.target instanceof Element ? event.target : null;
      pointer = { x: event.clientX, y: event.clientY, free: !target?.closest(SOLID) };
      scene.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => {
    pointer = null;
  });

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (hover < 0 || target?.closest(SOLID)) return;
    const node = scene.nodes[hover];
    if (!node) return;
    const behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth';
    if (node.section === 'top') window.scrollTo({ top: 0, behavior });
    else document.getElementById(node.section)?.scrollIntoView({ behavior, block: 'start' });
  });

  document.addEventListener('themechange', () => scene.setTheme(currentTheme()));

  document.addEventListener('visibilitychange', () => {
    window.cancelAnimationFrame(frame);
    if (!document.hidden) frame = window.requestAnimationFrame(tick);
  });

  measure(true);
  frame = window.requestAnimationFrame(tick);
}

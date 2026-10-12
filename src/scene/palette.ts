export type SceneTheme = 'dark' | 'light';

export interface ScenePalette {
  /** One colour per cluster, in CLUSTER_ORDER. Mirrors the --c-* tokens in global.css. */
  clusters: [string, string, string, string, string];
  /** Glowing points add light on a dark page; on a light page they have to be ink. */
  additive: boolean;
  dust: number;
  edge: number;
  halo: number;
  pulse: number;
  /** How far a pulse core is pushed toward white. */
  pulseWhite: number;
  /** Strength of the highlight on each node sphere. */
  specular: number;
}

export const SCENE_PALETTES: Record<SceneTheme, ScenePalette> = {
  dark: {
    clusters: ['#cfd8e6', '#56d4ff', '#a594ff', '#58e6b8', '#ffc978'],
    additive: true,
    dust: 0.85,
    edge: 0.42,
    halo: 0.5,
    pulse: 1,
    pulseWhite: 0.75,
    specular: 0.55,
  },
  light: {
    clusters: ['#48505e', '#0074a6', '#5a45d6', '#0a8f6a', '#a86a00'],
    additive: false,
    dust: 0.6,
    edge: 0.5,
    halo: 0.2,
    pulse: 0.95,
    pulseWhite: 0,
    specular: 0.9,
  },
};

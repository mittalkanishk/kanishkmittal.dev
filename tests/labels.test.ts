import { describe, expect, it } from 'vitest';
import { isCovered, type Box } from '../src/scene/labels';

describe('isCovered', () => {
  const card: Box = { left: 200, top: 100, right: 500, bottom: 300 };

  it('is clear when there is nothing to hide behind', () => {
    expect(isCovered({ x: 250, y: 150, radius: 8 }, 120, [])).toBe(false);
  });

  it('is covered when the label starts inside a card', () => {
    expect(isCovered({ x: 250, y: 150, radius: 8 }, 120, [card])).toBe(true);
  });

  it('is covered when the label runs into a card from the left', () => {
    expect(isCovered({ x: 100, y: 150, radius: 8 }, 120, [card])).toBe(true);
  });

  it('is clear when the label ends before the card begins', () => {
    expect(isCovered({ x: 40, y: 150, radius: 8 }, 120, [card])).toBe(false);
  });

  it('is clear above, below and to the right of the card', () => {
    expect(isCovered({ x: 250, y: 60, radius: 8 }, 120, [card])).toBe(false);
    expect(isCovered({ x: 250, y: 340, radius: 8 }, 120, [card])).toBe(false);
    expect(isCovered({ x: 520, y: 150, radius: 8 }, 120, [card])).toBe(false);
  });

  it('starts the label outside a large node sphere', () => {
    expect(isCovered({ x: 150, y: 150, radius: 8 }, 30, [card])).toBe(false);
    expect(isCovered({ x: 150, y: 150, radius: 40 }, 30, [card])).toBe(true);
  });

  it('checks every box', () => {
    const header: Box = { left: 0, top: 0, right: 1440, bottom: 64 };
    expect(isCovered({ x: 900, y: 40, radius: 8 }, 80, [card, header])).toBe(true);
  });
});

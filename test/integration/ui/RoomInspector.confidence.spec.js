import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

describe('RoomInspector confidence UI', () => {
  it('renders high-confidence UI correctly', async () => {
    global.React = React;
    const { default: RoomInspector } = await import('../../../src/components/DevPage/RoomInspector.jsx');

    const game = {
      roomState: {
        clothingOnFloor: { estimated: 5, confidence: 0.82 },
        cardboard: { estimated: 3, confidence: 0.82 },
        floorTrash: { estimated: 4, confidence: 0.82 },
        miscellaneousFloorItems: { estimated: 7, confidence: 0.82 },
      },
    };

    const html = renderToString(React.createElement(RoomInspector, { game, applyEffects: () => {}, observeField: vi.fn() }));

  // rendered HTML may include comment nodes between text nodes; test for fragments
  // allow for React comment nodes (<!-- -->) between text nodes
  expect(html).toMatch(/Room model confidence:\s*(?:<!--.*?-->\s*)*82(?:<!--.*?-->\s*)*%/);
  expect(html).toContain('Recently verified');
  expect(html).not.toContain('The dungeon may have shifted');
  });

  it('renders low-confidence UI and VERIFY STATE button', async () => {
    global.React = React;
    const { default: RoomInspector } = await import('../../../src/components/DevPage/RoomInspector.jsx');

    const game = {
      roomState: {
        clothingOnFloor: { estimated: 5, confidence: 0.48 },
        cardboard: { estimated: 3, confidence: 0.48 },
        floorTrash: { estimated: 4, confidence: 0.48 },
        miscellaneousFloorItems: { estimated: 7, confidence: 0.48 },
      },
    };

    const html = renderToString(React.createElement(RoomInspector, { game, applyEffects: () => {}, observeField: vi.fn() }));

  expect(html).toMatch(/Room model confidence:\s*(?:<!--.*?-->\s*)*48(?:<!--.*?-->\s*)*%/);
    expect(html).toContain('The dungeon may have shifted');
    expect(html).toContain('VERIFY STATE');
  });
});

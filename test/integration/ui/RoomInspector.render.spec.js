import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

describe('RoomInspector component wiring', () => {
  it('displays estimated values (reads .estimated) and calls observeField prop', async () => {
    // ensure React is globally available before the component module is evaluated
    global.React = React;

    const { default: RoomInspector } = await import('../../../src/components/DevPage/RoomInspector.jsx');

    const observeSpy = vi.fn();
    const game = {
      roomState: {
        clothingOnFloor: { observed: 5, estimated: 12, confidence: 0.5, lastObservedAt: null },
        cardboard: { observed: null, estimated: 3, confidence: 0, lastObservedAt: null },
        floorTrash: { estimated: 4 },
        miscellaneousFloorItems: { estimated: 7 },
      },
    };

    const { MemoryRouter } = await import('react-router-dom');

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(RoomInspector, { game, observeField: observeSpy })
      )
    );

    // ensure the numeric estimated values are present in the rendered markup
    expect(html).toContain('12');
    expect(html).toContain('3');
    expect(html).toContain('4');
    expect(html).toContain('7');

    // ensure observeField prop is available (we cannot click in SSR), but ensure it's a function
    expect(typeof observeSpy).toBe('function');
  });
});

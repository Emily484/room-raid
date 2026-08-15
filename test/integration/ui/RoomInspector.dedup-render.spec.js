import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';

// Ensure React global for SSR import-time code
global.React = React;

import { MIN_CALIBRATION_SAMPLES } from '../../../src/game/calibration.js';

describe('RoomInspector calibration dedupe rendering (SSR)', () => {
  it('renders deduped summary when duplicates present in storage', async () => {
    // Provide a simple localStorage shim for Node/Vitest if missing
    if (typeof localStorage === 'undefined' || localStorage === null) {
      global.localStorage = (function () {
        let store = {};
        return {
          getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
          setItem(key, value) { store[key] = String(value); },
          removeItem(key) { delete store[key]; },
          clear() { store = {}; }
        };
      }());
    }

    // Create 5 persisted records but only 2 unique field+analysisId pairs
    const records = [
      { id: 'a1', createdAt: '2026-08-14T10:00:00.000Z', analysisId: 'analysis-1', field: 'clothingOnFloor', verdict: 'accurate' },
      { id: 'a2', createdAt: '2026-08-14T10:01:00.000Z', analysisId: 'analysis-1', field: 'clothingOnFloor', verdict: 'accurate' },
      { id: 'a3', createdAt: '2026-08-14T10:02:00.000Z', analysisId: 'analysis-2', field: 'clothingOnFloor', verdict: 'accurate' },
      { id: 'a4', createdAt: '2026-08-14T10:03:00.000Z', analysisId: 'analysis-2', field: 'clothingOnFloor', verdict: 'accurate' },
      { id: 'a5', createdAt: '2026-08-14T10:04:00.000Z', analysisId: 'analysis-2', field: 'clothingOnFloor', verdict: 'accurate' },
    ];

    localStorage.setItem('roomRaidCalibration', JSON.stringify(records));

  const { default: RoomInspector } = await import('../../../src/components/DevPage/RoomInspector.jsx');
  const { MemoryRouter } = await import('react-router-dom');

  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(RoomInspector, { game: { roomState: {} }, applyEffects: () => {}, observeField: () => {}, approveObservedField: () => {}, scanState: { scan: null, totalImages: 0 } })));

    // Ensure summary contains clothingOnFloor
    expect(html).toContain('clothingOnFloor');
  // It should show deduped counts: Samples: 2, Accurate: 2
  // React SSR may include comment markers around numeric nodes ("<!-- -->2"), so use
  // regex matches that allow the optional comment marker when checking rendered output.
  expect(html).toMatch(/Samples:\s*(?:<!-- -->\s*)?2/);
  expect(html).toMatch(/Accurate:\s*(?:<!-- -->\s*)?2/);
    // Since MIN_CALIBRATION_SAMPLES is 3, enoughSamples should be false
    expect(html).toContain(`No (need ${MIN_CALIBRATION_SAMPLES})`);
  });
});

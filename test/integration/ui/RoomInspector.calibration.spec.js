import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';

import { recordCalibrationFeedback, summarizeCalibration, MIN_CALIBRATION_SAMPLES } from '../../../src/game/calibration.js';

describe('RoomInspector calibration summary regression (SSR)', () => {
  it('does not throw when rendering and summarizeCalibration reflects min-sample threshold', async () => {
    // ensure React is globally available before the component module is evaluated
    global.React = React;

    // provide a minimal localStorage shim for Node/Vitest if missing
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
    localStorage.removeItem('roomRaidCalibration');

    // record a single sample
    recordCalibrationFeedback({ field: 'clothingOnFloor', verdict: 'too_high', proposedValue: 10, correctedValue: 8 });

    const summary = summarizeCalibration();
    // find clothingOnFloor summary
    const s = summary.find(x => x.field === 'clothingOnFloor');
    expect(s).toBeTruthy();
    expect(s.samples).toBe(1);
    // It should not yet have enough samples
    expect(s.enoughSamples).toBe(false);
    // Ensure suggested text would reference the constant
    expect(typeof MIN_CALIBRATION_SAMPLES).toBe('number');

  // Ensure RoomInspector can be imported and rendered (SSR) without throwing
  const { default: RoomInspector } = await import('../../../src/components/DevPage/RoomInspector.jsx');
  // provide a minimal Router context so links/hooks inside RoomInspector don't throw during SSR
  const { MemoryRouter } = await import('react-router-dom');
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(RoomInspector, { game: { roomState: {} }, applyEffects: () => {}, observeField: () => {}, approveObservedField: () => {}, scanState: {} })));
    expect(html).toContain('Calibration Summary');
  });
});

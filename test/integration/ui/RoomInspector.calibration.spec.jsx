import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

// Bring in the calibration helpers and the component
import { recordCalibrationFeedback, MIN_CALIBRATION_SAMPLES } from '../../../src/game/calibration.js';

describe('RoomInspector calibration summary regression', () => {
  it('renders calibration summary after saved feedback and respects MIN_CALIBRATION_SAMPLES', async () => {
    // Provide a simple localStorage shim for Node/Vitest if missing
    if (typeof localStorage === 'undefined' || localStorage === null) {
      // minimal in-memory localStorage
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

    // ensure calibration storage is clear
    localStorage.removeItem('roomRaidCalibration');

    // record a single feedback record for 'clothingOnFloor'
    recordCalibrationFeedback({
      field: 'clothingOnFloor',
      verdict: 'too_high',
      proposedValue: 10,
      correctedValue: 8,
    });

    // Render the RoomInspector in a DOM so useEffect runs and reads localStorage
    const { default: RoomInspector } = await import('../../../src/components/DevPage/RoomInspector.jsx');
    const { MemoryRouter } = await import('react-router-dom');

    const container = document.createElement('div');
    document.body.appendChild(container);

    await act(async () => {
      const root = createRoot(container);
      root.render(React.createElement(MemoryRouter, null, React.createElement(RoomInspector, { game: { roomState: {} }, applyEffects: () => {}, observeField: () => {}, approveObservedField: () => {}, scanState: {} })));
      // allow effects to run
      await new Promise((r) => setTimeout(r, 0));
    });

    const html = container.innerHTML;
    // The Calibration Summary header should be present
    expect(html).toContain('Calibration Summary');

    // Because we only recorded one sample, the summary should indicate the minimum sample threshold
    expect(html).toMatch(new RegExp(`No \(need ${MIN_CALIBRATION_SAMPLES}\)`));
  });
});

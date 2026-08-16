import React from 'react';
import { describe, it, expect } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

import { createApp } from '../../../../server/app.js';

// We'll mount the app with a mock scan and a mock observer and then render RoomInspector
import RoomInspector from '../../../../src/components/DevPage/RoomInspector.jsx';

// minimal helper to mount component into JSDOM
function renderComponent(component) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(component);
  });
  return { container, root };
}

describe('RoomInspector calibration feedback wiring', () => {
  it('saves Accurate verdict and isolates per-field state', async () => {
    // Setup: create a fake game and scan with two proposals
    const fakeGame = { roomState: { clothingOnFloor: { estimated: 5 }, cardboard: { estimated: 0 } } };

    // Create fake latest analysis with two proposals for two different fields
    const latestAnalysis = {
      id: 'a1',
      createdAt: new Date().toISOString(),
      observation: {},
    };

    // Create two proposals: clothingOnFloor and cardboard
    const proposals = [
      {
        field: 'clothingOnFloor',
        currentValue: 5,
        proposedValue: 7,
        rawProposedValue: 7,
        observation: {},
        confidence: 0.8,
        rationale: 'x',
        evidence: [],
      },
      {
        field: 'cardboard',
        currentValue: 0,
        proposedValue: 1,
        rawProposedValue: 1,
        observation: {},
        confidence: 0.6,
        rationale: 'y',
        evidence: [],
      }
    ];

    // We will render RoomInspector directly and provide props expected
    const props = {
      game: fakeGame,
      applyEffects: () => {},
      observeField: () => {},
      approveObservedField: () => {},
      scanState: { scan: { id: 'scan-1', slots: {} }, totalImages: 0 }
    };

    // Render component
    const { container } = renderComponent(React.createElement(RoomInspector, props));

    // Manually set proposals into DOM by simulating that latestAnalysis exists and proposals are generated
    // For brevity, we'll find the first instance of the Accurate radio and click it for the first proposal

    // Find the radio inputs by name attribute pattern
    const accurateRadio = container.querySelector('input[name="verdict-clothingOnFloor"][value="accurate"]');
    expect(accurateRadio).toBeTruthy();

    // Click Accurate for clothingOnFloor
    act(() => { accurateRadio.click(); });

    // Click Save Feedback button for the clothingOnFloor proposal (first Save Feedback button)
    const saveButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'Save Feedback');
    expect(saveButtons.length).toBeGreaterThan(0);

    // Click the first Save Feedback
    act(() => { saveButtons[0].click(); });

    // Now check localStorage for a recorded feedback entry
    const raw = localStorage.getItem('roomRaidCalibration');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    // Should contain at least one entry with field clothingOnFloor and verdict 'accurate'
    const rec = parsed.find(r => r.field === 'clothingOnFloor');
    expect(rec).toBeTruthy();
    expect(rec.verdict).toBe('accurate');

    // Ensure that another field (cardboard) has no verdict recorded
    const rec2 = parsed.find(r => r.field === 'cardboard');
    expect(!rec2).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import calibration, { FIELD_CALIBRATION, MIN_CALIBRATION_SAMPLES, applyCalibrationToProposal, recordCalibrationFeedback, summarizeCalibration, getCalibrationRule } from '../../../src/game/calibration.js';

beforeEach(() => {
  // Provide a simple localStorage shim for Node/Vitest if missing
  if (typeof localStorage === 'undefined' || localStorage === null) {
    global.localStorage = (function () {
      let store = {};
      return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
        setItem(key, value) { store[key] = String(value); },
        removeItem(key) { delete store[key]; },
        clear() { store = {}; },
      };
    })();
  }

  // clear localStorage key used by calibration module
  localStorage.removeItem('roomRaidCalibration');
});

describe('calibration math and storage', () => {
  it('applies multiplier and offset and clamps values', () => {
    const proposal = { field: 'clothingOnFloor', proposedValue: 10 };
    const cfg = FIELD_CALIBRATION.clothingOnFloor;
    // baseline: multiplier 1 offset 0
    const out = applyCalibrationToProposal(proposal);
    expect(out.rawProposedValue).toBe(10);
    expect(out.proposedValue).toBe(10);

  // apply override via persistence helper (do not mutate canonical defaults)
  const { saveCalibrationRule } = require('../../../src/game/calibration.js');
  saveCalibrationRule('clothingOnFloor', { multiplier: 1, offset: -5 });
  const out2 = applyCalibrationToProposal({ field: 'clothingOnFloor', proposedValue: 3 });
    expect(out2.rawProposedValue).toBe(3);
    // 3 + (-5) => -2, clamp to 0 for count
    expect(out2.proposedValue).toBe(0);

    // percent clamp via persisted override
    const { saveCalibrationRule: saveRule2 } = require('../../../src/game/calibration.js');
    saveRule2('surfaceClutter', { multiplier: 1.2, offset: 10 });
    const out3 = applyCalibrationToProposal({ field: 'surfaceClutter', proposedValue: 90 });
    expect(out3.proposedValue).toBe(100); // clamped
  });

  it('records feedback and summarizes metrics', () => {
    const rec1 = recordCalibrationFeedback({ field: 'looseClothing', verdict: 'too_high', proposedValue: 45, correctedValue: 35 });
    const rec2 = recordCalibrationFeedback({ field: 'looseClothing', verdict: 'too_high', proposedValue: 50, correctedValue: 40 });
    const rec3 = recordCalibrationFeedback({ field: 'looseClothing', verdict: 'too_low', proposedValue: 30, correctedValue: 35 });

    const summary = summarizeCalibration();
    const loose = summary.find(s => s.field === 'looseClothing');
    expect(loose.samples).toBe(3);
    expect(loose.too_high).toBe(2);
    expect(loose.too_low).toBe(1);
    expect(typeof loose.meanSignedError).toBe('number');
    expect(typeof loose.meanAbsoluteError).toBe('number');
  });

  it('rejects invalid feedback', () => {
    expect(() => recordCalibrationFeedback(null)).toThrow();
    expect(() => recordCalibrationFeedback({ field: 'x', verdict: 'nope' })).toThrow();
    expect(() => recordCalibrationFeedback({ field: 'x', verdict: 'too_high', correctedValue: 'not-a-number' })).toThrow();
  });
});

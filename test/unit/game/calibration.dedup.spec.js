import { describe, it, expect, beforeEach } from 'vitest';
import { recordCalibrationFeedback, summarizeCalibration } from '../../../src/game/calibration.js';

// Use localStorage shim
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

describe('calibration dedup and replace behavior', () => {
  beforeEach(() => {
    localStorage.removeItem('roomRaidCalibration');
  });

  it('saving twice for same field+analysisId replaces previous record', () => {
    const a1 = recordCalibrationFeedback({ analysisId: 'A', field: 'f1', verdict: 'accurate' });
    expect(a1).toBeTruthy();
    const a2 = recordCalibrationFeedback({ analysisId: 'A', field: 'f1', verdict: 'too_high' });
    expect(a2).toBeTruthy();
    const all = JSON.parse(localStorage.getItem('roomRaidCalibration'));
    const matches = all.filter(x => x.field === 'f1' && x.analysisId === 'A');
    expect(matches.length).toBe(1);
    expect(matches[0].verdict).toBe('too_high');
  });

  it('same field different analysisId produces two samples', () => {
    recordCalibrationFeedback({ analysisId: 'A', field: 'f1', verdict: 'accurate' });
    recordCalibrationFeedback({ analysisId: 'B', field: 'f1', verdict: 'accurate' });
    const all = JSON.parse(localStorage.getItem('roomRaidCalibration'));
    const matches = all.filter(x => x.field === 'f1');
    expect(matches.length).toBe(2);
  });

  it('different fields same analysisId produce two samples', () => {
    recordCalibrationFeedback({ analysisId: 'A', field: 'f1', verdict: 'accurate' });
    recordCalibrationFeedback({ analysisId: 'A', field: 'f2', verdict: 'accurate' });
    const all = JSON.parse(localStorage.getItem('roomRaidCalibration'));
    expect(all.length).toBe(2);
  });

  it('existing duplicate stored records are deduplicated on load/summarization', () => {
    // simulate existing duplicates written out-of-band
    const dup = [
      { id: 'x1', createdAt: '2026-01-01T00:00:00.000Z', analysisId: 'A', field: 'f1', verdict: 'accurate' },
      { id: 'x2', createdAt: '2026-02-01T00:00:00.000Z', analysisId: 'A', field: 'f1', verdict: 'too_low' },
    ];
    localStorage.setItem('roomRaidCalibration', JSON.stringify(dup));

    const summary = summarizeCalibration();
    // After dedupe, only one sample for f1 should be counted
    const s = summary.find(x => x.field === 'f1');
    expect(s).toBeTruthy();
    expect(s.samples).toBe(1);
  });

  it('records lacking analysisId are preserved', () => {
    recordCalibrationFeedback({ field: 'f1', verdict: 'accurate' });
    recordCalibrationFeedback({ field: 'f1', verdict: 'too_low' });
    const all = JSON.parse(localStorage.getItem('roomRaidCalibration'));
    expect(all.length).toBe(2);
  });
});

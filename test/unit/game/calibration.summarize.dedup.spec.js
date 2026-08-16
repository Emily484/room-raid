import { describe, it, expect, beforeEach } from 'vitest';
import { summarizeCalibration } from '../../../src/game/calibration.js';

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

describe('summarizeCalibration dedupe behavior', () => {
  beforeEach(() => {
    localStorage.removeItem('roomRaidCalibration');
  });

  it('collapses duplicates with same field+analysisId and summarizes correctly', () => {
    const records = [
      { id: 'a1', createdAt: '2026-08-14T10:00:00.000Z', analysisId: 'analysis-1', field: 'clothingOnFloor', verdict: 'accurate' },
      { id: 'a2', createdAt: '2026-08-14T10:01:00.000Z', analysisId: 'analysis-1', field: 'clothingOnFloor', verdict: 'accurate' },
      { id: 'a3', createdAt: '2026-08-14T10:02:00.000Z', analysisId: 'analysis-2', field: 'clothingOnFloor', verdict: 'accurate' },
      { id: 'a4', createdAt: '2026-08-14T10:03:00.000Z', analysisId: 'analysis-2', field: 'clothingOnFloor', verdict: 'accurate' },
      { id: 'a5', createdAt: '2026-08-14T10:04:00.000Z', analysisId: 'analysis-2', field: 'clothingOnFloor', verdict: 'accurate' },
    ];
    localStorage.setItem('roomRaidCalibration', JSON.stringify(records));

    const summary = summarizeCalibration();
    const s = summary.find(x => x.field === 'clothingOnFloor');
    expect(s).toBeTruthy();
    expect(s.samples).toBe(2);
    expect(s.accurate).toBe(2);
  });
});

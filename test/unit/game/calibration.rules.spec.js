import { describe, it, expect, beforeEach } from 'vitest';
import { FIELD_CALIBRATION, saveCalibrationRule, loadCalibrationRules, getEffectiveCalibrationRule, clearCalibrationRule, applyCalibrationToProposal } from '../../../src/game/calibration.js';

beforeEach(() => {
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
  localStorage.removeItem('roomRaidCalibrationRules');
});

describe('calibration rules persistence', () => {
  it('defaults used when no stored override exists', () => {
    const eff = getEffectiveCalibrationRule('clothingOnFloor');
    expect(eff.multiplier).toBe(FIELD_CALIBRATION.clothingOnFloor.multiplier);
    expect(eff.offset).toBe(FIELD_CALIBRATION.clothingOnFloor.offset);
  });

  it('saving override persists and is merged', () => {
    const before = JSON.parse(JSON.stringify(FIELD_CALIBRATION));
    saveCalibrationRule('clothingOnFloor', { multiplier: 1, offset: -10 });
    const raw = loadCalibrationRules();
    expect(raw.clothingOnFloor).toBeTruthy();
    const eff = getEffectiveCalibrationRule('clothingOnFloor');
    expect(eff.offset).toBe(-10);
    // ensure canonical defaults unchanged
    expect(FIELD_CALIBRATION).toEqual(before);
  });

  it('reset removes override', () => {
    saveCalibrationRule('clothingOnFloor', { multiplier: 1, offset: -10 });
    clearCalibrationRule('clothingOnFloor');
    const raw = loadCalibrationRules();
    expect(raw.clothingOnFloor).toBeUndefined();
    const eff = getEffectiveCalibrationRule('clothingOnFloor');
    expect(eff.offset).toBe(FIELD_CALIBRATION.clothingOnFloor.offset);
  });

  it('malformed JSON falls back safely', () => {
    localStorage.setItem('roomRaidCalibrationRules', '{notjson');
    const eff = getEffectiveCalibrationRule('clothingOnFloor');
    expect(eff.offset).toBe(FIELD_CALIBRATION.clothingOnFloor.offset);
  });

  it('invalid rule rejected', () => {
    expect(() => saveCalibrationRule('clothingOnFloor', { multiplier: NaN, offset: 1 })).toThrow();
    expect(() => saveCalibrationRule('clothingOnFloor', { multiplier: 1 })).toThrow();
  });

  it('unknown field rejected', () => {
    expect(() => saveCalibrationRule('unknownField', { multiplier: 1, offset: 1 })).toThrow();
  });

  it('calibrated proposal reflects persisted rule', () => {
    const roomState = { clothingOnFloor: { estimated: 10 } };
    const proposal = { field: 'clothingOnFloor', proposedValue: 50 };
    // baseline
    const out1 = applyCalibrationToProposal(proposal);
    expect(out1.rawProposedValue).toBe(50);
    expect(out1.proposedValue).toBe(50);

    saveCalibrationRule('clothingOnFloor', { multiplier: 1, offset: -10 });
    const out2 = applyCalibrationToProposal(proposal);
    expect(out2.rawProposedValue).toBe(50);
    expect(out2.proposedValue).toBe(40);
  });

  it('recording/applying calibration does not mutate roomState', () => {
    const roomState = { clothingOnFloor: { estimated: 10 } };
    const proposal = { field: 'clothingOnFloor', proposedValue: 50 };
    const copy = JSON.parse(JSON.stringify(roomState));
    saveCalibrationRule('clothingOnFloor', { multiplier: 1, offset: -10 });
    // ensure roomState unchanged
    expect(roomState).toEqual(copy);
  });
});

import { describe, it, expect } from 'vitest';
import { mkRoom } from '../../test-utils.js';
import { observeField } from '../../../src/game/roomFields.js';

describe('observeField (Room Inspector observation)', () => {
  it('direct manual observation replaces observed/estimated/confidence/lastObservedAt', () => {
    const key = 'clothingOnFloor';
    const before = mkRoom({ [key]: { observed: 80, estimated: 62, confidence: 0.76, lastObservedAt: '2026-08-01T12:00:00.000Z' } });

    const ts = '2026-08-09T19:00:00.000Z';
    const after = observeField(before, key, 67, ts);

    expect(after[key]).toBeTruthy();
    expect(after[key].observed).toBe(67);
    expect(after[key].estimated).toBe(67);
    expect(after[key].confidence).toBe(1);
    expect(after[key].lastObservedAt).toBe(ts);
  });

  it('inspector Less / More updates observed and estimated and timestamp/confidence', () => {
    const key = 'miscellaneousFloorItems';
    const before = mkRoom({ [key]: { observed: 10, estimated: 10, confidence: 0.5, lastObservedAt: '2026-08-01T12:00:00.000Z' } });

    const ts = '2026-08-09T19:01:00.000Z';
    const afterLess = observeField(before, key, 5, ts);
    expect(afterLess[key].observed).toBe(5);
    expect(afterLess[key].estimated).toBe(5);
    expect(afterLess[key].confidence).toBe(1);
    expect(afterLess[key].lastObservedAt).toBe(ts);

    const ts2 = '2026-08-09T19:02:00.000Z';
    const afterMore = observeField(before, key, 20, ts2);
    expect(afterMore[key].observed).toBe(20);
    expect(afterMore[key].estimated).toBe(20);
    expect(afterMore[key].confidence).toBe(1);
    expect(afterMore[key].lastObservedAt).toBe(ts2);
  });

  it('applyStateEffects (inference) still changes only estimated (sanity)', () => {
    // This sanity test ensures observation is separate from inference; we
    // rely on existing roomState tests to cover applyStateEffects in detail.
    const { applyStateEffects } = require('../../../src/game/roomState.js');
    const key = 'clothingOnFloor';
    const before = mkRoom({ [key]: { observed: 10, estimated: 10, confidence: 0.5, lastObservedAt: '2026-08-01T12:00:00.000Z' } });
    const after = applyStateEffects(before, { [key]: { operation: 'add', value: 5 } });

    // observed should be preserved (inference modifies estimated only)
    expect(after[key].observed).toBe(10);
    expect(after[key].estimated).toBe(15);
  });

  it('observeField is immutable: original state and nested object unchanged', () => {
    const key = 'cardboard';
    const before = mkRoom({ [key]: { observed: 7, estimated: 7, confidence: 0.5, lastObservedAt: '2026-08-01T12:00:00.000Z' } });
    const beforeNested = before[key];

    const after = observeField(before, key, 3, '2026-08-09T19:03:00.000Z');

    // original object untouched
    expect(before[key].observed).toBe(7);
    expect(before[key].estimated).toBe(7);
    // new state has new field object
    expect(after[key]).not.toBe(beforeNested);
    expect(after[key].observed).toBe(3);
  });

  it('observing negative counts produces 0 for observed and estimated', () => {
    const key = 'miscellaneousFloorItems';
    const before = mkRoom({ [key]: { observed: 5, estimated: 5, confidence: 0.5, lastObservedAt: '2026-08-01T12:00:00.000Z' } });
    const after = observeField(before, key, -10, '2026-08-09T19:04:00.000Z');
    expect(after[key].observed).toBe(0);
    expect(after[key].estimated).toBe(0);
  });
});

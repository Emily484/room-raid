import { describe, it, expect } from 'vitest';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { mkRoom, est } from '../../test-utils.js';

function observedOf(room, key) {
  return room[key]?.observed ?? null;
}

describe('applyStateEffects', () => {
  it('ignores non-finite numeric effects and preserves state', () => {
  const before = mkRoom({ clothingOnFloor: 10 });
  const after = applyStateEffects(before, { clothingOnFloor: NaN });
  // estimated should be unchanged and observed preserved
  expect(est(after, 'clothingOnFloor')).toBe(10);
  expect(observedOf(after, 'clothingOnFloor')).toBe(10);
  });

  it('handles object operations set/add and clamps values', () => {
  const before = mkRoom({ clothingOnFloor: 90 });
  const after = applyStateEffects(before, { clothingOnFloor: { operation: 'add', value: 20 } });
  // raw/count-based fields only guarantee estimated >= 0; they need not cap at 100
  expect(est(after, 'clothingOnFloor')).toBe(110);
  const after2 = applyStateEffects(before, { clothingOnFloor: { operation: 'set', value: -10 } });
  expect(est(after2, 'clothingOnFloor')).toBe(0);
  });

  it('does not allow modifying derived keys directly', () => {
  const before = mkRoom({ clothingOnFloor: 10 });
  const after = applyStateEffects(before, { floorClutter: { operation: 'set', value: 0 } });
  expect(after.floorClutter).toBeUndefined();
  });

  it('preserves observed/confidence/lastObservedAt when applying an effect to estimated', () => {
    const key = 'clothingOnFloor';
    const before = mkRoom({ [key]: { observed: 80, estimated: 80, confidence: 1, lastObservedAt: '2026-08-09T18:00:00.000Z' } });
    const after = applyStateEffects(before, { [key]: { operation: 'add', value: -10 } });

    // Phase 5 semantics: estimated changed, other fields unchanged
    expect(after[key].observed).toBe(80);
    expect(after[key].estimated).toBe(70);
    expect(after[key].confidence).toBe(1);
    expect(after[key].lastObservedAt).toBe('2026-08-09T18:00:00.000Z');
  });
});

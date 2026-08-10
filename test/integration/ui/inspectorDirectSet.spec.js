import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../../../src/game/derivedState.js';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { mkRoom, est } from '../../test-utils.js';
import { observeField } from '../../../src/game/roomFields.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('inspector direct set', () => {
  it('handles set, boundaries, clamping, and invalid input safety', () => {
    const key = 'miscellaneousFloorItems';
  const room = mkRoom();
  const after = observeField(room, key, 37);
  expect(est(after, key)).toBe(37);
  const derived = calculateDerivedState(after);
  expect(typeof derived.floorClutter).toBe('number');

  const a0 = observeField(room, key, 0);
  expect(est(a0, key)).toBe(0);
  const a100 = observeField(room, key, 100);
  expect(est(a100, key)).toBe(100);

  const aNeg = observeField(room, key, -5);
  expect(est(aNeg, key)).toBe(0);
  const aOver = observeField(room, key, 127);
  // miscellaneousFloorItems is a raw/count-based field; only lower bound 0 is enforced
  expect(est(aOver, key)).toBe(127);

    const aNaN = observeField(room, key, NaN);
    // NaN coerces to 0 per observeField helper
    expect(est(aNaN, key)).toBe(0);

    const aBlank = applyStateEffects(room, {});
    expect(est(aBlank, key)).toBe(est(room, key));
  });
});

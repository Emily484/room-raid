import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../../../src/game/derivedState.js';
import { applyStateEffects } from '../../../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('inspector direct set', () => {
  it('handles set, boundaries, clamping, and invalid input safety', () => {
    const key = 'miscellaneousFloorItems';
    const room = clone(defaultRoomState);
    const after = applyStateEffects(room, { [key]: { operation: 'set', value: 37 } });
    expect(after[key]).toBe(37);
    const derived = calculateDerivedState(after);
    expect(typeof derived.floorClutter).toBe('number');

    const a0 = applyStateEffects(room, { [key]: { operation: 'set', value: 0 } });
    expect(a0[key]).toBe(0);
    const a100 = applyStateEffects(room, { [key]: { operation: 'set', value: 100 } });
    expect(a100[key]).toBe(100);

    const aNeg = applyStateEffects(room, { [key]: { operation: 'set', value: -5 } });
    expect(aNeg[key]).toBe(0);
    const aOver = applyStateEffects(room, { [key]: { operation: 'set', value: 127 } });
    expect(aOver[key]).toBe(100);

    const aNaN = applyStateEffects(room, { [key]: { operation: 'set', value: NaN } });
    expect(Number.isNaN(aNaN[key])).toBe(false);

    const aBlank = applyStateEffects(room, {});
    expect(aBlank[key]).toBe(room[key]);
  });
});

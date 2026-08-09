import { describe, it, expect } from 'vitest';
import { applyStateEffects } from '../src/game/roomState.js';

describe('applyStateEffects', () => {
  it('ignores non-finite numeric effects and preserves state', () => {
    const before = { clothingOnFloor: 10 };
    const after = applyStateEffects(before, { clothingOnFloor: NaN });
    expect(after.clothingOnFloor).toBe(10);
  });

  it('handles object operations set/add and clamps values', () => {
    const before = { clothingOnFloor: 90 };
    const after = applyStateEffects(before, { clothingOnFloor: { operation: 'add', value: 20 } });
    expect(after.clothingOnFloor).toBe(100);
    const after2 = applyStateEffects(before, { clothingOnFloor: { operation: 'set', value: -10 } });
    expect(after2.clothingOnFloor).toBe(0);
  });

  it('does not allow modifying derived keys directly', () => {
    const before = { clothingOnFloor: 10 };
    const after = applyStateEffects(before, { floorClutter: { operation: 'set', value: 0 } });
    expect(after.floorClutter).toBeUndefined();
  });
});

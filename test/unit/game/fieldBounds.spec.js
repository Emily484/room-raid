import { describe, it, expect } from 'vitest';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';

describe('field bounds enforcement', () => {
  it('clamps percent-like fields to 0..100 on additive effects', () => {
    const before = { ...defaultRoomState };
    // tubCleanliness initial 50 in defaultRoomState
    const after = applyStateEffects(before, { tubCleanliness: 60 });
    expect(after.tubCleanliness.estimated).toBe(100);

    const after2 = applyStateEffects(before, { tubCleanliness: 12 });
    expect(after2.tubCleanliness.estimated).toBe(62);
  });

  it('clamps percent-like fields on set and add operations', () => {
    const before = { ...defaultRoomState };
    const afterSet = applyStateEffects(before, { tubCleanliness: { operation: 'set', value: 120 } });
    expect(afterSet.tubCleanliness.estimated).toBe(100);

    const afterAdd = applyStateEffects(before, { tubCleanliness: { operation: 'add', value: 60 } });
    expect(afterAdd.tubCleanliness.estimated).toBe(100);
  });

  it('does not cap count fields above 100, only floors at 0', () => {
    const before = { ...defaultRoomState };
    const after = applyStateEffects(before, { cardboard: { operation: 'add', value: 50 } });
    expect(after.cardboard.estimated).toBe(before.cardboard.estimated + 50);

    const afterNeg = applyStateEffects(before, { cardboard: { operation: 'add', value: -1000 } });
    expect(afterNeg.cardboard.estimated).toBe(0);
  });
});

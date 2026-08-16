import { describe, it, expect } from 'vitest';
import { generateProposalForObservation } from '../../../src/game/reconciliation.js';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';

describe('reconciliation proposal shape', () => {
  it('includes currentValue for none_observed observations', () => {
    const obs = { field: 'cardboard', status: 'none_observed', confidence: 0.9 };
    const p = generateProposalForObservation({ roomState: defaultRoomState, observation: obs, currentValue: defaultRoomState.cardboard.estimated });
    expect(p).toHaveProperty('currentValue');
    expect(p.currentValue).toBe(defaultRoomState.cardboard.estimated);
  });

  it('includes currentValue for unknown observations', () => {
    const obs = { field: 'tubCleanliness', status: 'unknown' };
    const p = generateProposalForObservation({ roomState: defaultRoomState, observation: obs, currentValue: defaultRoomState.tubCleanliness.estimated });
    expect(p).toHaveProperty('currentValue');
    expect(p.currentValue).toBe(defaultRoomState.tubCleanliness.estimated);
  });
});

describe('Scour the Shrine (bathroom-tub-clean) semantics', () => {
  it('adds +60 to tubCleanliness and clamps to 100', () => {
    const before = { ...defaultRoomState };
    expect(before.tubCleanliness.estimated).toBe(50);
    const after = require('../../../src/game/roomState.js').applyStateEffects(before, { tubCleanliness: 60 });
    expect(after.tubCleanliness.estimated).toBe(100);
  });
});

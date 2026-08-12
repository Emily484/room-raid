import { describe, it, expect, beforeEach } from 'vitest';
import { generateProposalForObservation, generateProposals } from '../../../src/game/reconciliation.js';
import { FIELD_CALIBRATION } from '../../../src/game/calibration.js';

beforeEach(() => {
  // reset any local calibration tweaks
  if (FIELD_CALIBRATION.clothingOnFloor) {
    FIELD_CALIBRATION.clothingOnFloor.multiplier = 1;
    FIELD_CALIBRATION.clothingOnFloor.offset = 0;
  }
});

describe('reconciliation + calibration integration', () => {
  it('returns rawProposedValue and proposedValue (calibrated)', () => {
    const roomState = { clothingOnFloor: { estimated: 10 } };
    const analysis = { observation: { observations: [ { field: 'clothingOnFloor', estimatedRange: { min: 30, max: 50 }, confidence: 0.9 } ] } };

    // baseline: no calibration
    const proposals = generateProposals({ roomState, analysis });
    expect(proposals.length).toBe(1);
    const p = proposals[0];
    expect(p.rawProposedValue).toBeDefined();
    expect(p.proposedValue).toBeDefined();
    expect(p.rawProposedValue).toBe(p.proposedValue);

    // apply offset
    FIELD_CALIBRATION.clothingOnFloor.offset = -10;
    const proposals2 = generateProposals({ roomState, analysis });
    const p2 = proposals2[0];
    expect(p2.rawProposedValue).toBeDefined();
    expect(p2.proposedValue).toBe(p2.rawProposedValue - 10);
  });
});

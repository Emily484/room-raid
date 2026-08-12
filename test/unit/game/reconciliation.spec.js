import { describe, test, expect } from 'vitest';
import { generateProposalForObservation, generateProposals, approveProposal, approveAllHighConfidence } from '../../../src/game/reconciliation.js';
import { makeFieldFromValue } from '../../../src/game/roomFields.js';

describe('reconciliation engine', () => {
  test('count range midpoint conversion and rounding', () => {
    const roomState = { clothingOnFloor: makeFieldFromValue(29) };
    const obs = {
      field: 'clothingOnFloor',
      status: 'observed',
      estimatedRange: { min: 15, max: 30 },
      confidence: 0.9,
      evidence: []
    };

    const p = generateProposalForObservation({ roomState, observation: obs });
    expect(p.proposedValue).toBeCloseTo(22.5);
    expect(p.confidence).toBeCloseTo(0.9);
    expect(p.recommendation).toBe('strong_recommendation');
  });

  test('percent midpoint conversion and clamp', () => {
    const roomState = { floorObstruction: makeFieldFromValue(10) };
    const obs = {
      field: 'floorObstruction',
      status: 'observed',
      percentEstimate: { min: 5, max: 40 },
      confidence: 0.8,
      evidence: []
    };

    const p = generateProposalForObservation({ roomState, observation: obs });
    expect(p.proposedValue).toBeCloseTo(22.5);
    expect(p.recommendation).toBe('review');
  });

  test('unknown / not_visible produce no proposal', () => {
    const roomState = {};
    const obs = { field: 'surfaceCleanliness', status: 'not_visible', confidence: 0.9 };
    const p = generateProposalForObservation({ roomState, observation: obs });
    expect(p.recommendation).toBe('no_change');
  });

  test('low confidence -> no numeric proposal', () => {
    const roomState = { tableTrash: makeFieldFromValue(5) };
    const obs = { field: 'tableTrash', status: 'observed', estimatedRange: { min: 0, max: 2 }, confidence: 0.5 };
    const p = generateProposalForObservation({ roomState, observation: obs });
    expect(p.recommendation).toBe('manual_review');
    expect(p.proposedValue).toBeNull();
  });

  test('none_observed for count-like may propose zero when confident', () => {
    const roomState = { floorTrash: makeFieldFromValue(4) };
    const obs = { field: 'floorTrash', status: 'none_observed', confidence: 0.9 };
    const p = generateProposalForObservation({ roomState, observation: obs });
    expect(p.proposedValue).toBe(0);
    expect(p.recommendation).toBe('review');
  });

  test('approveProposal updates state via observeField semantics', () => {
    const rs = { clothingOnFloor: makeFieldFromValue(29) };
    const proposal = { field: 'clothingOnFloor', proposedValue: 20, confidence: 0.88 };
    const next = approveProposal(rs, proposal, '2026-08-11T00:00:00.000Z');
    expect(next.clothingOnFloor.estimated).toBe(20);
    expect(next.clothingOnFloor.observed).toBe(20);
    expect(next.clothingOnFloor.confidence).toBeCloseTo(0.88);
    expect(next.clothingOnFloor.lastObservedAt).toBe('2026-08-11T00:00:00.000Z');
  });

  test('approveAllHighConfidence applies only eligible proposals', () => {
    const rs = { clothingOnFloor: makeFieldFromValue(29), floorTrash: makeFieldFromValue(3) };
    const proposals = [
      { field: 'clothingOnFloor', proposedValue: 22, confidence: 0.9 },
      { field: 'floorTrash', proposedValue: 0, confidence: 0.7 },
    ];
    const { next, applied } = approveAllHighConfidence(rs, proposals, undefined, '2026-08-11T00:00:00.000Z');
    // only clothingOnFloor (0.9 >= 0.85) applied
    expect(applied).toEqual(['clothingOnFloor']);
    expect(next.clothingOnFloor.estimated).toBe(22);
    expect(next.floorTrash.estimated).toBe(3);
  });
});

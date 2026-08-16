import { describe, it, expect } from 'vitest';
import { validateObservationDetailed } from '../../../server/services/visionObservationSchema.js';

function baseObs() {
  return {
    version: 1,
    summary: 'x',
    coverage: { bedroomOverview: null, floor: null, surfaces: null, bathroom: null },
    observations: [],
    warnings: []
  };
}

describe('validateObservationDetailed', () => {
  it('reports unknown field', () => {
    const o = baseObs();
    o.observations = [{ field: 'notAField', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 0.5, evidence: [], reason: 'x' }];
    const res = validateObservationDetailed(o);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.path === '/observations[0].field')).toBe(true);
  });

  it('reports invalid confidence', () => {
    const o = baseObs();
    o.observations = [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 1.5, evidence: [], reason: 'x' }];
    const res = validateObservationDetailed(o);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.path === '/observations[0].confidence')).toBe(true);
  });

  it('reports bad range', () => {
    const o = baseObs();
    o.observations = [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: { min: 5, max: 2 }, percentEstimate: null, confidence: 0.5, evidence: [], reason: 'x' }];
    const res = validateObservationDetailed(o);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.path === '/observations[0].estimatedRange.max')).toBe(true);
  });

  it('reports nonexistent imageId', () => {
    const o = baseObs();
    o.observations = [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 0.5, evidence: [{ slotId: 'floor', imageId: 'does-not-exist' }], reason: 'x' }];
    const scan = { slots: { floor: [{ id: 'other' }] } };
    const res = validateObservationDetailed(o, scan);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.path === '/observations[0].evidence[0].imageId')).toBe(true);
  });

  it('reports wrong slot for image', () => {
    const o = baseObs();
    o.observations = [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 0.5, evidence: [{ slotId: 'surfaces', imageId: 'img-wrong' }], reason: 'x' }];
    const scan = { slots: { floor: [{ id: 'img-wrong' }] } };
    const res = validateObservationDetailed(o, scan);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.path === '/observations[0].evidence[0].slotId')).toBe(true);
  });
});

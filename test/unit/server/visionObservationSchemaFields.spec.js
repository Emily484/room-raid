import { describe, it, expect } from 'vitest';
import { OBSERVATION_SCHEMA, ALLOWED_FIELDS, validateObservation } from '../../../server/services/visionObservationSchema.js';

describe('OBSERVATION_SCHEMA field enum', () => {
  it('has field.enum equal to ALLOWED_FIELDS', () => {
    const enumList = OBSERVATION_SCHEMA.properties.observations.items.properties.field.enum.slice().sort();
    const allowed = Array.from(ALLOWED_FIELDS).slice().sort();
    expect(enumList).toEqual(allowed);
  });

  it('rejects invented field via runtime validation', () => {
    const obs = {
      version: 1,
      summary: 'x',
      coverage: { bedroomOverview: null, floor: null, surfaces: null, bathroom: null },
      observations: [{ field: 'overall_room_clutter', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 0.5, evidence: [], reason: 'x' }],
      warnings: []
    };
    const res = validateObservation(obs);
    expect(res).toBe(false);
  });

  it('accepts canonical field via runtime validation', () => {
    const obs = {
      version: 1,
      summary: 'x',
      coverage: { bedroomOverview: null, floor: null, surfaces: null, bathroom: null },
      observations: [{ field: 'clothingOnFloor', status: 'observed', severity: 'low', estimatedRange: null, percentEstimate: null, confidence: 0.5, evidence: [], reason: 'x' }],
      warnings: []
    };
    const res = validateObservation(obs);
    expect(res).toBe(true);
  });

  it('observer instructions forbid inventing or renaming fields', () => {
    const { OBSERVER_INSTRUCTIONS } = require('../../../server/services/visionObserver.js');
    expect(OBSERVER_INSTRUCTIONS).toMatch(/Never invent, rename, snake_case, combine, or generalize fields/);
  });
});

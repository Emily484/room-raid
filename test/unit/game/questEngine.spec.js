import { describe, it, expect } from 'vitest';
import { checkRequirement, questMeetsRequirements } from '../../../src/game/questEngine.js';
import { mkRoom } from '../../test-utils.js';

describe('questEngine requirement checks', () => {
  it('returns false for missing key or non-number', () => {
    expect(checkRequirement({ key: 'missing', operator: '>', value: 10 }, {})).toBe(false);
    expect(checkRequirement({ key: 'str', operator: '==', value: 'a' }, { str: 'a' })).toBe(false);
  });

  it('handles all comparison operators', () => {
    const s = mkRoom({ a: 5 });
    expect(checkRequirement({ key: 'a', operator: '>', value: 4 }, s)).toBe(true);
    expect(checkRequirement({ key: 'a', operator: '>=', value: 5 }, s)).toBe(true);
    expect(checkRequirement({ key: 'a', operator: '<', value: 6 }, s)).toBe(true);
    expect(checkRequirement({ key: 'a', operator: '<=', value: 5 }, s)).toBe(true);
    expect(checkRequirement({ key: 'a', operator: '==', value: 5 }, s)).toBe(true);
  });

  it('questMeetsRequirements returns true for no requirements', () => {
    expect(questMeetsRequirements({} , {})).toBe(true);
  });

  it('reads canonical modeled fields via estimated and accepts derived numeric fields', () => {
    // modeled field (object-shaped) — use mkRoom
    const modeled = mkRoom({ clothingOnFloor: 12 });
    expect(checkRequirement({ key: 'clothingOnFloor', operator: '>=', value: 10 }, modeled)).toBe(true);

    // derived numeric field provided as a plain number
    const derivedState = { floorClutter: 15 };
    expect(checkRequirement({ key: 'floorClutter', operator: '<=', value: 20 }, derivedState)).toBe(true);

    // non-finite derived numeric should be rejected
    expect(checkRequirement({ key: 'floorClutter', operator: '<=', value: 20 }, { floorClutter: NaN })).toBe(false);
    expect(checkRequirement({ key: 'floorClutter', operator: '<=', value: 20 }, { floorClutter: Infinity })).toBe(false);
  });
});

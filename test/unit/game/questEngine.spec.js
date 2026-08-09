import { describe, it, expect } from 'vitest';
import { checkRequirement, questMeetsRequirements } from '../../../src/game/questEngine.js';

describe('questEngine requirement checks', () => {
  it('returns false for missing key or non-number', () => {
    expect(checkRequirement({ key: 'missing', operator: '>', value: 10 }, {})).toBe(false);
    expect(checkRequirement({ key: 'str', operator: '==', value: 'a' }, { str: 'a' })).toBe(false);
  });

  it('handles all comparison operators', () => {
    const s = { a: 5 };
    expect(checkRequirement({ key: 'a', operator: '>', value: 4 }, s)).toBe(true);
    expect(checkRequirement({ key: 'a', operator: '>=', value: 5 }, s)).toBe(true);
    expect(checkRequirement({ key: 'a', operator: '<', value: 6 }, s)).toBe(true);
    expect(checkRequirement({ key: 'a', operator: '<=', value: 5 }, s)).toBe(true);
    expect(checkRequirement({ key: 'a', operator: '==', value: 5 }, s)).toBe(true);
  });

  it('questMeetsRequirements returns true for no requirements', () => {
    expect(questMeetsRequirements({} , {})).toBe(true);
  });
});

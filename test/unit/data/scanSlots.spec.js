import { describe, it, expect } from 'vitest';
import { SCAN_SLOTS } from '../../../src/data/scanSlots.js';

describe('scanSlots config', () => {
  it('exports four canonical slots with maxImages', () => {
    expect(Array.isArray(SCAN_SLOTS)).toBe(true);
    expect(SCAN_SLOTS.length).toBe(4);
    for (const s of SCAN_SLOTS) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.label).toBe('string');
      expect(typeof s.description).toBe('string');
      expect(typeof s.maxImages).toBe('number');
    }
  });
});

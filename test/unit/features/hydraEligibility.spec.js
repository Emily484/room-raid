/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { calculateDerivedState } from '../../../src/game/derivedState.js';
import { getAvailableQuests } from '../../../src/game/questEngine.js';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';

describe('Feed the Hydra eligibility', () => {
  it('looseClothing > 5 alone does NOT make textile-dirty-laundry eligible', () => {
    const room = { ...defaultRoomState };

    // set looseClothing high but do NOT provide dirtyClothing
    room.looseClothing = { estimated: 9, confidence: 0.2 };

    const available = getAvailableQuests('textile-wastes', room, []);

    const ids = available.map(q => q.id);

    expect(ids).not.toContain('textile-dirty-laundry');
  });
});

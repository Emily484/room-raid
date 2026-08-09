import { describe, it, expect } from 'vitest';
import { checkRequirement, explainQuestScore } from '../src/game/questEngine.js';
import { calculateSurfaceExposure, calculateBathroomCounterExposure } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';

describe('game module branch coverage helpers', () => {
  it('checkRequirement returns false for unknown operator', () => {
    const s = { a: 10 };
    expect(checkRequirement({ key: 'a', operator: '??', value: 5 }, s)).toBe(false);
  });

  it('scoreQuest handles unlock simulation errors gracefully', () => {
    // Create a fake quest whose variant.stateEffects throws when iterated
    const throwingEffects = {};
    Object.defineProperty(throwingEffects, 'bad', {
      get() {
        throw new Error('boom');
      },
      enumerable: true,
    });

    const fakeQuest = {
      id: 'fake-throw-quest',
      zoneId: 'fake-zone',
      priority: 50,
      variants: {
        normal: {
          stateEffects: throwingEffects,
        },
      },
      requirements: [],
      category: 'misc',
    };

    // We call explainQuestScore directly — it will call scoreQuest and return components
    const room = { clothingOnFloor: 0 };
    const result = explainQuestScore(fakeQuest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });

    // The unlockPotential simulation should be caught and not throw; it should stay 0
    expect(result.components.unlockPotential).toBe(0);
  });

  it('calculateSurfaceExposure and bathroom exposure clamp edge values', () => {
    expect(calculateSurfaceExposure({ surfaceClutter: -100 })).toBe(100);
    expect(calculateSurfaceExposure({ surfaceClutter: 200 })).toBe(0);

    expect(calculateBathroomCounterExposure({ bathroomCounterClutter: -5 })).toBe(100);
    expect(calculateBathroomCounterExposure({ bathroomCounterClutter: 500 })).toBe(0);
  });

  it('applyStateEffects ignores unknown operations and ignores non-finite object adds/sets', () => {
    const before = { tableTrash: 20 };

    // unknown operation should leave value unchanged
    const afterUnknown = applyStateEffects(before, { tableTrash: { operation: 'mul', value: 2 } });
    expect(afterUnknown.tableTrash).toBe(20);

    // non-finite add should be ignored
    const afterBadAdd = applyStateEffects(before, { tableTrash: { operation: 'add', value: NaN } });
    expect(afterBadAdd.tableTrash).toBe(20);

    // non-finite set should be ignored
    const afterBadSet = applyStateEffects(before, { tableTrash: { operation: 'set', value: Infinity } });
    expect(afterBadSet.tableTrash).toBe(20);
  });
});

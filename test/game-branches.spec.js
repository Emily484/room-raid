import { describe, it, expect } from 'vitest';
import { checkRequirement, explainQuestScore } from '../src/game/questEngine.js';
import { calculateSurfaceExposure, calculateBathroomCounterExposure } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { mkRoom, est } from './test-utils.js';

describe('game module branch coverage helpers', () => {
  it('checkRequirement returns false for unknown operator', () => {
  const s = mkRoom({ a: 10 });
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
  const room = mkRoom({ clothingOnFloor: 0 });
    const result = explainQuestScore(fakeQuest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });

    // The unlockPotential simulation should be caught and not throw; it should stay 0
    expect(result.components.unlockPotential).toBe(0);
  });

  it('calculateSurfaceExposure and bathroom exposure clamp edge values', () => {
  expect(calculateSurfaceExposure(mkRoom({ surfaceClutter: -100 }))).toBe(100);
  expect(calculateSurfaceExposure(mkRoom({ surfaceClutter: 200 }))).toBe(0);

  expect(calculateBathroomCounterExposure(mkRoom({ bathroomCounterClutter: -5 }))).toBe(100);
  expect(calculateBathroomCounterExposure(mkRoom({ bathroomCounterClutter: 500 }))).toBe(0);
  });

  it('applyStateEffects ignores unknown operations and ignores non-finite object adds/sets', () => {
    const before = mkRoom({ tableTrash: 20 });

    // unknown operation should leave value unchanged
    const afterUnknown = applyStateEffects(before, { tableTrash: { operation: 'mul', value: 2 } });
    expect(est(afterUnknown, 'tableTrash')).toBe(20);

    // non-finite add should be ignored
    const afterBadAdd = applyStateEffects(before, { tableTrash: { operation: 'add', value: NaN } });
    expect(est(afterBadAdd, 'tableTrash')).toBe(20);

    // non-finite set should be ignored
    const afterBadSet = applyStateEffects(before, { tableTrash: { operation: 'set', value: Infinity } });
    expect(est(afterBadSet, 'tableTrash')).toBe(20);
  });
});

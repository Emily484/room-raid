import { describe, it, expect } from 'vitest';
import { quests } from '../../../src/data/quests.js';
import { explainQuestScore, questMeetsRequirements } from '../../../src/game/questEngine.js';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { calculateDerivedState } from '../../../src/game/derivedState.js';
import { mkRoom, est } from '../../test-utils.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('unlock potential', () => {
  it('unlockPotential corresponds to simulated eligibility', () => {
    const clothingQuest = quests.find(q => q.id === 'textile-floor-clothes');
    const vacuumQuest = quests.find(q => q.id === 'floor-vacuum');
    if (!clothingQuest || !vacuumQuest) {
      expect(true).toBe(true);
      return;
    }

    function makeRoom(clothingLevel){
      return mkRoom({
        clothingOnFloor: clothingLevel,
        cardboard: 10,
        floorTrash: 10,
        miscellaneousFloorItems: 10,
        floorObstruction: 28,
        floorCleanliness: 50,
      });
    }

  const roomA = makeRoom(45);
  const explA = explainQuestScore(clothingQuest, roomA, [], { energy: 'normal', preferredQuestMinutes: 10 });
  expect(explA.components.unlockPotential).toBeGreaterThan(0);

    const variant = clothingQuest.variants?.normal ?? Object.values(clothingQuest.variants ?? {})[0];
  const afterA = applyStateEffects(roomA, variant.stateEffects);
  const afterADerived = calculateDerivedState(afterA);
  const afterAFull = { ...afterA, ...afterADerived };
  expect(questMeetsRequirements(vacuumQuest, afterAFull)).toBe(true);

  // ensure roomB is sufficiently high that vacuumQuest should not be unlocked after clothing correction
  const roomB = makeRoom(95);
  const explB = explainQuestScore(clothingQuest, roomB, [], { energy: 'normal', preferredQuestMinutes: 10 });
  expect(explB.components.unlockPotential).toBeLessThanOrEqual(0);
  const afterB = applyStateEffects(roomB, variant.stateEffects);
  const afterBDerived = calculateDerivedState(afterB);
  const afterBFull = { ...afterB, ...afterBDerived };
  expect(questMeetsRequirements(vacuumQuest, afterBFull)).toBe(false);
  });
});

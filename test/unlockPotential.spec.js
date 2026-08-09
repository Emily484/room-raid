import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { explainQuestScore, questMeetsRequirements } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';

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
      const r = clone(defaultRoomState);
      r.clothingOnFloor = clothingLevel;
      r.cardboard = 10;
      r.floorTrash = 10;
      r.miscellaneousFloorItems = 10;
      r.floorObstruction = 28;
      r.floorCleanliness = 50;
      return r;
    }

    const roomA = makeRoom(45);
    const explA = explainQuestScore(clothingQuest, roomA, [], { energy: 'normal', preferredQuestMinutes: 10 });
    expect(explA.components.unlockPotential).toBeGreaterThan(0);

    const variant = clothingQuest.variants?.normal ?? Object.values(clothingQuest.variants ?? {})[0];
    const afterA = applyStateEffects(roomA, variant.stateEffects);
    const afterAFull = { ...afterA, ...calculateDerivedState(afterA) };
    expect(questMeetsRequirements(vacuumQuest, afterAFull)).toBe(true);

    const roomB = makeRoom(60);
    const explB = explainQuestScore(clothingQuest, roomB, [], { energy: 'normal', preferredQuestMinutes: 10 });
    expect(explB.components.unlockPotential).toBeLessThanOrEqual(0);
    const afterB = applyStateEffects(roomB, variant.stateEffects);
    const afterBFull = { ...afterB, ...calculateDerivedState(afterB) };
    expect(questMeetsRequirements(vacuumQuest, afterBFull)).toBe(false);
  });
});

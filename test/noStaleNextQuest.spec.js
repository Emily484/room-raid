import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { getAvailableQuests, getNextQuest } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('no stale next quest', () => {
  it('next selection reflects updated post-completion state', () => {
    const clothingQuest = quests.find(q => q.id === 'textile-floor-clothes');
    const vacuumQuest = quests.find(q => q.id === 'floor-vacuum');
    expect(clothingQuest && vacuumQuest).toBeTruthy();

    const roomBefore = clone(defaultRoomState);
    roomBefore.clothingOnFloor = 45;
    roomBefore.cardboard = 10;
    roomBefore.floorTrash = 10;
    roomBefore.miscellaneousFloorItems = 10;
    roomBefore.floorObstruction = 28;
    roomBefore.floorCleanliness = 50;

    const derivedBefore = calculateDerivedState(roomBefore);
    expect(derivedBefore.floorClutter).toBeGreaterThan(20);

    const availBefore = getAvailableQuests('random', roomBefore, []);
    expect(availBefore.some(q => q.id === vacuumQuest.id)).toBe(false);

    const variant = clothingQuest.variants.normal;
    const roomAfter = applyStateEffects(roomBefore, variant.stateEffects);
    const derivedAfter = calculateDerivedState(roomAfter);
    expect(derivedAfter.floorClutter).toBeLessThanOrEqual(20);

    const availAfter = getAvailableQuests('random', roomAfter, []);
    expect(availAfter.some(q => q.id === vacuumQuest.id)).toBe(true);

    const next = getNextQuest('random', roomAfter, [], [], null, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(next).toBeTruthy();
    expect(availAfter.some(q => q.id === next.id)).toBe(true);
  });
});

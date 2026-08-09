import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { getAvailableQuests, getNextQuest, questMeetsRequirements } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: No stale-state next quest — selection should reflect post-completion state');

const clothingQuest = quests.find(q => q.id === 'textile-floor-clothes');
const vacuumQuest = quests.find(q => q.id === 'floor-vacuum');
assert(clothingQuest && vacuumQuest, 'Required quests not found');

// Construct a room just above the vacuum threshold so completing clothingQuest unlocks it
const roomBefore = clone(defaultRoomState);
roomBefore.clothingOnFloor = 45;
roomBefore.cardboard = 10;
roomBefore.floorTrash = 10;
roomBefore.miscellaneousFloorItems = 10;
roomBefore.floorObstruction = 28; // exposedFloor = 72
roomBefore.floorCleanliness = 50; // < 75

const derivedBefore = calculateDerivedState(roomBefore);
console.log(' derived before:', derivedBefore);
assert(derivedBefore.floorClutter > 20, 'Precondition failed: floorClutter already <= 20');

const availBefore = getAvailableQuests('random', roomBefore, []);
const vacuumInBefore = availBefore.some(q => q.id === vacuumQuest.id);
assert(!vacuumInBefore, 'Precondition failed: vacuum already available before completion');

// Simulate completing the clothing quest (normal variant)
const variant = clothingQuest.variants.normal;
const roomAfter = applyStateEffects(roomBefore, variant.stateEffects);
const derivedAfter = calculateDerivedState(roomAfter);
console.log(' derived after:', derivedAfter);
assert(derivedAfter.floorClutter <= 20, 'After completion floorClutter did not drop to allow vacuum');

const availAfter = getAvailableQuests('random', roomAfter, []);
const vacuumInAfter = availAfter.some(q => q.id === vacuumQuest.id);
assert(vacuumInAfter, 'Vacuum did not appear in available pool after completion');

// Now ask the engine for next quest using the updated state — this must pick from availAfter
const next = getNextQuest('random', roomAfter, [], [], null, { energy: 'normal', preferredQuestMinutes: 10 });
assert(next, 'No next quest returned after completion');
const nextInAfter = availAfter.some(q => q.id === next.id);
assert(nextInAfter, 'Next quest was not from the post-completion available pool (stale state used)');

console.log('Next quest after completion:', next.id, '-', next.title);
console.log('PASS: next selection used updated post-completion state (no stale-state selection)');

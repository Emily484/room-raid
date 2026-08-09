import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { explainQuestScore, questMeetsRequirements } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: No unlockPotential when the target quest is already available');

const clothingQuest = quests.find(q => q.id === 'textile-floor-clothes');
const vacuumQuest = quests.find(q => q.id === 'floor-vacuum');
if (!clothingQuest || !vacuumQuest) {
  console.log('SKIP: required sample quests not found');
  process.exit(0);
}

// Build a room where vacuum is already eligible
const room = clone(defaultRoomState);
room.clothingOnFloor = 0;
room.cardboard = 0;
room.floorTrash = 10;
room.miscellaneousFloorItems = 10;
room.floorObstruction = 20; // exposedFloor = 80
room.floorCleanliness = 50; // < 75

const full = { ...room, ...calculateDerivedState(room) };
assert(questMeetsRequirements(vacuumQuest, full), 'Precondition failed: vacuum should already be eligible in this scenario');

const expl = explainQuestScore(clothingQuest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' unlockPotential=', expl.components.unlockPotential);
assert.strictEqual(expl.components.unlockPotential, 0, 'Expected unlockPotential to be 0 when the target is already eligible');

// Also ensure applying the variant keeps vacuum eligible (no double-counting / toggling)
const variant = clothingQuest.variants?.normal ?? Object.values(clothingQuest.variants ?? {})[0];
const after = applyStateEffects(room, variant.stateEffects);
const afterFull = { ...after, ...calculateDerivedState(after) };
assert(questMeetsRequirements(vacuumQuest, afterFull), 'After applying effects the vacuum should remain eligible');

console.log('PASS: unlockPotential is zero for already-available targets');

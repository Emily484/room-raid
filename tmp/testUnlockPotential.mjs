import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { explainQuestScore, questMeetsRequirements } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Unlock potential corresponds to actual future eligibility');

const clothingQuest = quests.find(q => q.id === 'textile-floor-clothes');
const vacuumQuest = quests.find(q => q.id === 'floor-vacuum');
if (!clothingQuest || !vacuumQuest) {
  console.log('SKIP: required sample quests not found');
  process.exit(0);
}

// Helper to build a room with chosen clothing level and fixed other contributors
function makeRoom(clothingLevel){
  const r = clone(defaultRoomState);
  // contributors to floorClutter
  r.clothingOnFloor = clothingLevel;
  r.cardboard = 10;
  r.floorTrash = 10;
  r.miscellaneousFloorItems = 10;
  // ensure exposedFloor and cleanliness criteria are otherwise satisfied
  r.floorObstruction = 28; // exposedFloor = 72 >= 70
  r.floorCleanliness = 50; // < 75

  return r;
}

// Scenario A: just short of vacuum; clothing quest should unlock vacuum
const roomA = makeRoom(45); // initial floorClutter ~= 20.5 -> after -15 becomes ~16

const explA = explainQuestScore(clothingQuest, roomA, [], { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' Scenario A: unlockPotential=', explA.components.unlockPotential);
assert(explA.components.unlockPotential > 0, 'Expected unlockPotential > 0 when quest would enable a vacuum');

// Simulate applying the clothing quest's normal variant effects and verify vacuum becomes eligible
const variant = clothingQuest.variants?.normal ?? Object.values(clothingQuest.variants ?? {})[0];
const afterA = applyStateEffects(roomA, variant.stateEffects);
const afterAFull = { ...afterA, ...calculateDerivedState(afterA) };
assert(questMeetsRequirements(vacuumQuest, afterAFull), 'After applying effects the vacuum quest should be eligible (but was not)');
console.log(' ✓ Scenario A: unlockPotential corresponds to a real unlock');

// Scenario B: clothing is so high that the same quest does not lower floorClutter enough
const roomB = makeRoom(60); // initial floorClutter ~= 25 -> after -15 becomes ~20.5 (still >20)
const explB = explainQuestScore(clothingQuest, roomB, [], { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' Scenario B: unlockPotential=', explB.components.unlockPotential);
assert(!(explB.components.unlockPotential > 0), 'Expected no unlockPotential when effects do not enable a vacuum');

const afterB = applyStateEffects(roomB, variant.stateEffects);
const afterBFull = { ...afterB, ...calculateDerivedState(afterB) };
assert(!questMeetsRequirements(vacuumQuest, afterBFull), 'After applying effects the vacuum quest should still be ineligible');
console.log(' ✓ Scenario B: unlockPotential disappears when the simulated effects do not enable the target quest');

console.log('PASS: unlockPotential matches actual simulated eligibility');

import { quests } from '../src/data/quests.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

const VACUUM_ID = 'floor-vacuum';

let state = { ...defaultRoomState };

function checkRequirement(requirement, roomState) {
  const currentValue = roomState?.[requirement.key];

  if (currentValue === undefined) {
    return false;
  }

  switch (requirement.operator) {
    case ">":
      return currentValue > requirement.value;
    case ">=":
      return currentValue >= requirement.value;
    case "<":
      return currentValue < requirement.value;
    case "<=":
      return currentValue <= requirement.value;
    case "===":
      return currentValue === requirement.value;
    default:
      return false;
  }
}

function questMeetsRequirements(quest, roomState) {
  if (!quest.requirements || quest.requirements.length === 0) return true;
  return quest.requirements.every(r => checkRequirement(r, roomState));
}

function vacuumAvailable(s) {
  const derived = calculateDerivedState(s);
  const full = { ...s, ...derived };
  return quests.some(q => q.id === VACUUM_ID && q.zoneId === 'great-floor' && questMeetsRequirements(q, full));
}

console.log('Initial derived:', calculateDerivedState(state));
console.log('Is vacuum available initially?', vacuumAvailable(state));

// We'll repeatedly apply a mix of tasks that reduce the concrete components used by floorClutter
// floorClutter uses clothingOnFloor (0.30), cardboard (0.25), floorTrash (0.15), miscellaneousFloorItems (0.30)
// We'll alternate effects until vacuum becomes available or we cap iterations.

const effectsPool = [
  { clothingOnFloor: -15, looseClothing: -10 }, // clothing purge normal
  { cardboard: -20 }, // flatten boxes normal
  { floorTrash: -20 }, // remove floor trash normal
  { miscellaneousFloorItems: -18 }, // relocate items normal
];

let steps = 0;
const maxSteps = 20;
let lastApplied = null;

while (!vacuumAvailable(state) && steps < maxSteps) {
  // pick an effect in round-robin
  const effect = effectsPool[steps % effectsPool.length];
  state = applyStateEffects(state, effect);
  steps++;
  lastApplied = effect;
  const derived = calculateDerivedState(state);
  console.log(`Step ${steps}: applied ${JSON.stringify(effect)} -> floorClutter=${derived.floorClutter.toFixed(2)}, exposedFloor=${derived.exposedFloor.toFixed(2)}`);
}

console.log('Final derived:', calculateDerivedState(state));
console.log('Vacuum available after steps?', vacuumAvailable(state));
console.log('Steps taken:', steps, 'Last applied:', lastApplied);

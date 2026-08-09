import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { explainQuestScore } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { quests } from '../src/data/quests.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Urgency behaves monotonically');

// Clothing-based quest
const clothingQuest = quests.find(q => q.id === 'textile-floor-clothes');
assert(clothingQuest, 'Clothing Purge quest not found');

const clothingValues = [20, 50, 90];
const clothingUrgencies = [];

let base = clone(defaultRoomState);
for (const v of clothingValues) {
  const room = applyStateEffects(base, { clothingOnFloor: { operation: 'set', value: v } });
  const expl = explainQuestScore(clothingQuest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  clothingUrgencies.push(expl.components.urgency);
  console.log(` clothingOnFloor=${v} -> urgency=${expl.components.urgency.toFixed(3)} total=${expl.total}`);
}

assert(clothingUrgencies[0] < clothingUrgencies[1] && clothingUrgencies[1] < clothingUrgencies[2], 'Clothing urgency not monotonic increasing');
console.log(' ✓ Clothing-based quest urgency increases monotonically');

// Cleanliness-based quest (tubCleanliness < 75)
const tubQuest = quests.find(q => q.id === 'bathroom-tub-clean');
assert(tubQuest, 'Tub cleaning quest not found');

const cleanlinessValues = [90, 50, 20]; // higher cleanliness -> lower urgency
const cleanlinessUrgencies = [];

for (const v of cleanlinessValues) {
  const room = applyStateEffects(base, { tubCleanliness: { operation: 'set', value: v } });
  const expl = explainQuestScore(tubQuest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  cleanlinessUrgencies.push(expl.components.urgency);
  console.log(` tubCleanliness=${v} -> urgency=${expl.components.urgency.toFixed(3)} total=${expl.total}`);
}

assert(cleanlinessUrgencies[0] < cleanlinessUrgencies[1] && cleanlinessUrgencies[1] < cleanlinessUrgencies[2], 'Cleanliness urgency not monotonic (worse cleanliness should increase urgency)');
console.log(' ✓ Cleanliness-based quest urgency increases as cleanliness worsens');

console.log('PASS: Urgency is monotonic for tested quests');

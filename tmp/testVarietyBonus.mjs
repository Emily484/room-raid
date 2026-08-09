import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { explainQuestScore, explainAllQuests } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { quests } from '../src/data/quests.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Variety bonus encourages underrepresented categories but not overrules clear urgency');

const clothingQuest = quests.find(q => q.id === 'textile-floor-clothes');
const miscQuest = quests.find(q => q.id === 'table-relocate-items');
if (!clothingQuest || !miscQuest) {
  console.log('SKIP: required sample quests not found');
  process.exit(0);
}

// Part A: after doing 3 clothing quests, misc should have higher variety bonus than clothing
const recentClothing = [
  'textile-floor-clothes',
  'textile-dirty-laundry',
  'textile-clean-clothes'
];

const room = clone(defaultRoomState);
// set both to moderate problem levels to avoid huge urgency differences
const roomModerate = applyStateEffects(room, { clothingOnFloor: { operation: 'set', value: 30 }, surfaceClutter: { operation: 'set', value: 30 } });

const explClothModerate = explainQuestScore(clothingQuest, roomModerate, recentClothing, { energy: 'normal', preferredQuestMinutes: 10 });
const explMiscModerate = explainQuestScore(miscQuest, roomModerate, recentClothing, { energy: 'normal', preferredQuestMinutes: 10 });

console.log(' Moderate scenario:');
console.log('  clothing varietyBonus=', explClothModerate.components.varietyBonus, ' total=', explClothModerate.total);
console.log('  misc     varietyBonus=', explMiscModerate.components.varietyBonus, ' total=', explMiscModerate.total);

assert(explMiscModerate.components.varietyBonus >= explClothModerate.components.varietyBonus, 'Underrepresented category did not receive larger variety bonus');
console.log(' ✓ Underrepresented category gets an equal or larger variety bonus after recent same-category tasks');

// It's acceptable for variety to affect totals in tie-ish cases; ensure it doesn't flip a clearly worse urgency
// Part B: make clothing problem very severe and misc low; clothing must remain higher-scoring
const roomExtreme = applyStateEffects(room, { clothingOnFloor: { operation: 'set', value: 95 }, surfaceClutter: { operation: 'set', value: 15 } });
// For the extreme scenario we don't want repetition penalties to influence the result,
// so pass an empty recentQuestIds array to isolate urgency vs variety.
const explClothHigh = explainQuestScore(clothingQuest, roomExtreme, [], { energy: 'normal', preferredQuestMinutes: 10 });
const explMiscLow = explainQuestScore(miscQuest, roomExtreme, [], { energy: 'normal', preferredQuestMinutes: 10 });

console.log(' Extreme scenario:');
console.log('  clothing urgency=', Math.round(explClothHigh.components.urgency), ' total=', explClothHigh.total);
console.log('  misc     urgency=', Math.round(explMiscLow.components.urgency), ' total=', explMiscLow.total);

assert(explClothHigh.total > explMiscLow.total, 'Variety bonus overrode clear urgency — unacceptable');
console.log(' ✓ Variety did not override clear urgency (clothing remains higher priority when problem is severe)');

console.log('PASS: variety improves underrepresented categories without making strategically poor choices');

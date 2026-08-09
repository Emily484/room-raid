import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { explainQuestScore } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { quests } from '../src/data/quests.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Corrections affect scoring (urgency and total respond)');

const room = clone(defaultRoomState);
const quest = quests.find(q => q.id === 'textile-floor-clothes');
assert(quest, 'Clothing Purge quest not found');

const explain0 = explainQuestScore(quest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' baseline urgency:', Math.round(explain0.components.urgency), ' total:', explain0.total);

// Increase clothingOnFloor
const increasedVal = Math.min(100, (room.clothingOnFloor ?? 0) + 25);
const roomInc = applyStateEffects(room, { clothingOnFloor: { operation: 'set', value: increasedVal } });
const explainInc = explainQuestScore(quest, roomInc, [], { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' after increase clothingOnFloor ->', roomInc.clothingOnFloor, ' urgency:', Math.round(explainInc.components.urgency), ' total:', explainInc.total);

assert(explainInc.components.urgency > explain0.components.urgency, 'Urgency did not increase after clothingOnFloor increased');
assert(explainInc.total > explain0.total, 'Total score did not increase after clothingOnFloor increased');

// Decrease substantially
const roomDec = applyStateEffects(roomInc, { clothingOnFloor: { operation: 'set', value: 0 } });
const explainDec = explainQuestScore(quest, roomDec, [], { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' after decrease clothingOnFloor ->', roomDec.clothingOnFloor, ' urgency:', Math.round(explainDec.components.urgency), ' total:', explainDec.total);

assert(explainDec.components.urgency < explainInc.components.urgency, 'Urgency did not decrease after clothingOnFloor decreased');
assert(explainDec.total < explainInc.total, 'Total did not decrease after clothingOnFloor decreased');

console.log('PASS: scoring reacts logically to manual reality corrections');

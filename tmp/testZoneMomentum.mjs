import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { explainQuestScore } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Zone momentum nudges local continuation but yields to clear urgency');

const floorTrash = quests.find(q => q.id === 'floor-trash');
const clothingPurge = quests.find(q => q.id === 'textile-floor-clothes');
if (!floorTrash || !clothingPurge) {
  console.log('SKIP: required sample quests not found');
  process.exit(0);
}

// Recent activity: several tasks in the Great Floor zone
const recentGreatFloor = [
  'floor-misc-items',
  'floor-misc-items',
  'floor-misc-items'
];

// Baseline room where both zones are mildly problematic (so urgency is similar)
const room = clone(defaultRoomState);
const roomModerate = applyStateEffects(room, {
  floorTrash: { operation: 'set', value: 30 },
  clothingOnFloor: { operation: 'set', value: 30 },
  miscellaneousFloorItems: { operation: 'set', value: 30 },
});

const explSameZone = explainQuestScore(floorTrash, roomModerate, recentGreatFloor, { energy: 'normal', preferredQuestMinutes: 10 });
const explOtherZone = explainQuestScore(clothingPurge, roomModerate, recentGreatFloor, { energy: 'normal', preferredQuestMinutes: 10 });

console.log(' Phase A — After several Great Floor tasks:');
console.log('  same-zone (floor-trash) zoneMomentum=', explSameZone.components.zoneMomentum, ' total=', explSameZone.total);
console.log('  other-zone (clothing)         zoneMomentum=', explOtherZone.components.zoneMomentum, ' total=', explOtherZone.total);

assert(explSameZone.total > explOtherZone.total, 'Momentum did not prefer continuing locally when priorities are otherwise similar');
console.log(' ✓ Momentum nudges continuation in the same zone when choices are similar');

// Now make clothing dramatically more urgent — momentum should not trap the flow
const roomExtreme = applyStateEffects(roomModerate, {
  clothingOnFloor: { operation: 'set', value: 95 },
});

const explSameAfter = explainQuestScore(floorTrash, roomExtreme, recentGreatFloor, { energy: 'normal', preferredQuestMinutes: 10 });
const explOtherAfter = explainQuestScore(clothingPurge, roomExtreme, recentGreatFloor, { energy: 'normal', preferredQuestMinutes: 10 });

console.log(' Phase B — Clothing becomes dramatically worse:');
console.log('  same-zone (floor-trash) urgency=', Math.round(explSameAfter.components.urgency), ' total=', explSameAfter.total);
console.log('  other-zone (clothing)         urgency=', Math.round(explOtherAfter.components.urgency), ' total=', explOtherAfter.total);

assert(explOtherAfter.total > explSameAfter.total, 'Momentum trapped the system — it failed to switch to a clearly more urgent zone');
console.log(' ✓ Momentum did not prevent switching to a clearly more urgent zone');

console.log('PASS: Zone momentum behaves as a helpful nudge, not a prison');

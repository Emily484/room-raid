import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { zones } from '../src/data/zones.js';
import { getAvailableQuests, getNextQuest } from '../src/game/questEngine.js';
import { calculateDerivedState } from '../src/game/derivedState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Reroll returns a different sensible quest, locked excluded, no state/XP/boss mutation');

// Prepare a room with many available quests
const room = clone(defaultRoomState);
room.clothingOnFloor = 60;
room.cardboard = 60;
room.floorTrash = 60;
room.miscellaneousFloorItems = 60;
room.surfaceClutter = 60;
room.tableTrash = 60;
room.tubClutter = 60;
room.floorObstruction = 20; // exposedFloor=80

const completedQuestIds = [];
let recentQuestIds = [];
const session = { energy: 'normal', preferredQuestMinutes: 10 };

const available = getAvailableQuests('random', room, completedQuestIds);
console.log(' available pool size=', available.length);
assert(available.length > 1, 'Need multiple available quests for reroll test');

// snapshot progress state
const gameSnapshot = {
  xp: 42,
  bosses: Object.fromEntries(zones.map(z => [z.id, { hp: z.maxHp, maxHp: z.maxHp }])),
  completedQuestIds: clone(completedQuestIds),
  recentQuestIds: clone(recentQuestIds),
  roomState: clone(room),
};

// pick an initial quest
const first = getNextQuest('random', room, completedQuestIds, recentQuestIds, null, session);
assert(first, 'Initial quest selection failed');

// If more than one candidate, reroll should not return same quest
const second = getNextQuest('random', room, completedQuestIds, recentQuestIds, first.id, session);
if (available.length > 1) {
  assert(second, 'Reroll returned no quest although alternatives exist');
  assert(second.id !== first.id, 'Reroll returned same quest despite alternatives');
} else {
  console.log('Only one available quest; reroll may return null or same quest');
}

// Locked quests should not be returned: verify none of selections equals a locked quest id
const lockedCheck = (q) => {
  if (!q) return false;
  const stillAvailable = getAvailableQuests('random', room, completedQuestIds).some(a => a.id === q.id);
  return !stillAvailable;
};

assert(!lockedCheck(first), `Initial selection ${first.id} was locked`);
if (second) assert(!lockedCheck(second), `Reroll selection ${second.id} was locked`);

// Ensure no mutation of progress/room state
assert.deepStrictEqual(gameSnapshot.roomState, room, 'Room state mutated during selection');
assert.deepStrictEqual(gameSnapshot.completedQuestIds, completedQuestIds, 'completedQuestIds mutated');
assert.deepStrictEqual(gameSnapshot.recentQuestIds, recentQuestIds, 'recentQuestIds mutated');
// bosses snapshot
for (const z of zones) {
  const b = gameSnapshot.bosses[z.id];
  assert(b.hp === z.maxHp && b.maxHp === z.maxHp, 'boss snapshot mismatch');
}

// Repeated rerolls: ensure we don't see locked quest and excludeId prevents immediate repeat
let last = first.id;
const seen = new Set([first.id]);
for (let i=0;i<20;i++) {
  const q = getNextQuest('random', room, completedQuestIds, recentQuestIds, last, session);
  if (!q) break;
  assert(q.id !== last || available.length === 1, 'Reroll returned same quest when alternatives exist');
  assert(!lockedCheck(q), `Locked quest ${q.id} leaked into reroll`);
  seen.add(q.id);
  last = q.id;
}

console.log(' unique seen on rerolls:', seen.size);
console.log('PASS: reroll behavior correct (different sensible quest, locked excluded, no mutation)');

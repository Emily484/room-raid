import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { getNextQuest, getAvailableQuests } from '../src/game/questEngine.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Smart Run selects across the whole dungeon (not literal random)');

// Build a room state that makes many quests eligible
const room = clone(defaultRoomState);
// increase many contributors so many zones have eligible quests
room.clothingOnFloor = 60;
room.cardboard = 60;
room.floorTrash = 60;
room.miscellaneousFloorItems = 60;
room.surfaceClutter = 60;
room.tableTrash = 60;
room.bedClutter = 60;
room.tubClutter = 60;
room.floorObstruction = 20; // exposedFloor = 80

const completedQuestIds = [];
const recentQuestIds = [];
const session = { energy: 'normal', preferredQuestMinutes: 10 };

const available = getAvailableQuests('random', room, completedQuestIds);
console.log(' available candidate count=', available.length);
assert(available.length > 1, 'Need multiple available quests for Smart Run to choose among');

const chosenZones = new Set();
const chosenIds = new Set();

let lastId = null;

for (let i=0;i<40;i++) {
  const q = getNextQuest('random', room, completedQuestIds, recentQuestIds, lastId, session);
  if (!q) break;

  // ensure q is in the available pool
  const found = available.find(a => a.id === q.id);
  assert(found, `Selected quest ${q.id} was not in available pool`);

  chosenZones.add(q.zoneId);
  chosenIds.add(q.id);

  // emulate user hitting 'give me something else' to exclude current id next time
  lastId = q.id;
}

console.log(' chosen zones:', Array.from(chosenZones).join(', '));
console.log(' chosen unique quests:', chosenIds.size);

assert(chosenZones.size >= 2, 'Smart Run did not choose quests from multiple zones');

console.log('PASS: Smart Run chooses strategically from whole dungeon and selections are within available pool');

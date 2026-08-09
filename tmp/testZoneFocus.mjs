import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { getNextQuest, getAvailableQuests } from '../src/game/questEngine.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Focused territory filters selection to that zone; Smart Run resumes whole-room selection');

const room = clone(defaultRoomState);
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

const zonesToTest = ['table-chaos','bathroom','great-floor'];

for (const z of zonesToTest) {
  const available = getAvailableQuests(z, room, completedQuestIds);
  console.log(` zone=${z} available=${available.length}`);
  assert(available.length > 0, `No available quests for zone ${z} in test room`);

  // Generate several quests for this zone and ensure they belong to the zone
  for (let i=0;i<8;i++) {
    const q = getNextQuest(z, room, completedQuestIds, recentQuestIds, null, session);
    assert(q, `Expected a quest for zone ${z}`);
    assert.strictEqual(q.zoneId, z, `Quest ${q.id} was selected but not in zone ${z}`);
    // emulate reroll exclusion of last id
    recentQuestIds.unshift(q.id);
    recentQuestIds.splice(5);
  }
}

// Now switch back to Smart Run and ensure selection includes multiple zones
const roomBefore = clone(room);
const chosenZones = new Set();
for (let i=0;i<30;i++) {
  const q = getNextQuest('random', room, completedQuestIds, recentQuestIds, null, session);
  if (!q) break;
  chosenZones.add(q.zoneId);
  // simulate reroll
  recentQuestIds.unshift(q.id);
  recentQuestIds.splice(5);
}

console.log(' Smart Run chose zones:', Array.from(chosenZones).join(', '));
assert(chosenZones.size >= 2, 'Smart Run did not resume whole-room selection (only one zone chosen)');

// Ensure room state unchanged
assert.deepStrictEqual(room, roomBefore, 'Room state was mutated during selection');

console.log('PASS: zone focus filters eligibility and Smart Run resumes whole-room selection; no room mutation');

import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { explainAllQuests, getNextQuest, getAvailableQuests } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Inspector unlock transition toggles LOCKED → AVAILABLE and main UI sees it without reload');

const lockedQuest = quests.find(q => q.id === 'table-wipe');
assert(lockedQuest, 'table-wipe quest must exist');

// Build a room state where the quest is locked but just above the threshold
const room = clone(defaultRoomState);
// table-wipe requires surfaceClutter <= 20, exposedSurface >=70, surfaceCleanliness <75
room.surfaceClutter = 22; // just above threshold
room.surfaceCleanliness = 50; // meets cleanliness requirement
room.exposedSurface = 70; // meets exposed requirement via derived normally

// Developer page explanation (before)
const explBefore = explainAllQuests(room, []);
const entryBefore = explBefore.find(e => e.id === lockedQuest.id);
assert(entryBefore, 'locked quest must be present in explanations');
assert(!entryBefore.eligible, 'Precondition failed: quest is already eligible before change');

// Now simulate Room Inspector direct set to reduce surfaceClutter to 20
const delta = 20 - room.surfaceClutter; // negative -2
const roomAfter = applyStateEffects(room, { surfaceClutter: delta });

// Developer page explanation (after)
const explAfter = explainAllQuests(roomAfter, []);
const entryAfter = explAfter.find(e => e.id === lockedQuest.id);
assert(entryAfter, 'locked quest missing after change');
assert(entryAfter.eligible, 'Quest did not become eligible in Developer explainAllQuests after inspector change');

// Main UI selection should now be able to return this quest in available pool
const availAfter = getAvailableQuests('random', roomAfter, []);
assert(availAfter.find(q => q.id === lockedQuest.id), 'Quest did not appear in available pool after inspector change');

const next = getNextQuest('random', roomAfter, [], [], null, { energy: 'normal', preferredQuestMinutes: 10 });
assert(next, 'getNextQuest returned no quest after unlock');
// Next quest may not be the locked one if others are higher scoring, but it must be in the available pool
assert(availAfter.some(q => q.id === next.id), 'Next quest chosen was not from updated available pool');

console.log('PASS: inspector change caused LOCKED → AVAILABLE and main UI sees the updated availability without reload');

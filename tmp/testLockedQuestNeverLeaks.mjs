import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { getNextQuest, getAvailableQuests, questMeetsRequirements } from '../src/game/questEngine.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Locked quests never leak into gameplay until requirements are met');

const locked = quests.find(q => q.id === 'table-wipe');
if (!locked) {
  console.log('SKIP: table-wipe quest not found');
  process.exit(0);
}

// Start with default room state where table-wipe is locked (surfaceClutter default 70)
let room = clone(defaultRoomState);
const completedQuestIds = [];
let recentQuestIds = [];

// Verify locked not in available
const availInitial = getAvailableQuests('random', room, completedQuestIds);
assert(!availInitial.find(q => q.id === locked.id), 'Precondition failed: locked quest is available initially');

const sessions = [
  { energy: 'low', preferredQuestMinutes: 3 },
  { energy: 'normal', preferredQuestMinutes: 10 },
  { energy: 'high', preferredQuestMinutes: 15 },
];

let seenLocked = false;

// Do many iterations: rerolls across sessions and focused modes, and complete other available quests
for (let iter = 0; iter < 60; iter++) {
  const session = sessions[iter % sessions.length];

  // Random run
  const q = getNextQuest('random', room, completedQuestIds, recentQuestIds, null, session);
  if (q && q.id === locked.id) {
    const full = { ...room, ...calculateDerivedState(room) };
    if (!questMeetsRequirements(locked, full)) seenLocked = true;
  }

  // Focused runs on a couple zones
  const zones = ['table-chaos','table-chaos','bathroom','great-floor'];
    for (const z of zones) {
    const q2 = getNextQuest(z, room, completedQuestIds, recentQuestIds, null, session);
    if (q2 && q2.id === locked.id) {
      const full = { ...room, ...calculateDerivedState(room) };
      if (!questMeetsRequirements(locked, full)) seenLocked = true;
    }
  }

  // Simulate completing one available non-locked quest (if any)
  const pool = getAvailableQuests('random', room, completedQuestIds).filter(x => x.id !== locked.id);
  if (pool.length > 0) {
    const pick = pool[iter % pool.length];
    // apply its normal variant effects if present
    const variant = pick.variants?.normal ?? Object.values(pick.variants ?? {})[0];
    if (variant?.stateEffects) {
      room = applyStateEffects(room, variant.stateEffects);
    }

    // update recent quests tracking like the app
    recentQuestIds = [pick.id, ...recentQuestIds.filter(id => id !== pick.id)].slice(0,5);
    // mark non-repeatable as completed
    if (!pick.repeatable) completedQuestIds.push(pick.id);
  }

  // After mutation ensure locked still not in available pool
  const afterPool = getAvailableQuests('random', room, completedQuestIds);
  const foundLocked = afterPool.find(q => q.id === locked.id);
  if (foundLocked) {
    const full = { ...room, ...calculateDerivedState(room) };
    if (!questMeetsRequirements(locked, full)) seenLocked = true;
  }

  assert(!seenLocked, 'Locked quest leaked into selection before requirements were met');
}

console.log('No leak detected after rerolls, session changes, focus switches, and completing other tasks.');

// Now make the room such that table-wipe becomes eligible
room = applyStateEffects(room, { surfaceClutter: { operation: 'set', value: 15 }, surfaceCleanliness: { operation: 'set', value: 50 } });

const finalAvail = getAvailableQuests('random', room, completedQuestIds);
assert(finalAvail.find(q => q.id === locked.id), 'After satisfying requirements, locked quest should be available but is not');

console.log('PASS: locked quest did not appear until its requirements were satisfied');

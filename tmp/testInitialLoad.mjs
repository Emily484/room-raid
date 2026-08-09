import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { zones } from '../src/data/zones.js';
import { getNextQuest } from '../src/game/questEngine.js';

// Fail the test if code logs warnings or errors during initialization
console._warn = console.warn;
console._error = console.error;
console.warn = (...args) => { throw new Error('console.warn called: ' + args.join(' ')); };
console.error = (...args) => { throw new Error('console.error called: ' + args.join(' ')); };

function makeInitialBosses() {
  return Object.fromEntries(
    zones.map((zone) => [
      zone.id,
      {
        hp: zone.maxHp,
        maxHp: zone.maxHp,
      },
    ])
  );
}

console.log('Test: initial load smoke test — clean game, one quest, session defaults, no console errors');

const game = {
  xp: 0,
  completedQuests: 0,
  completedQuestIds: [],
  recentQuestIds: [],
  roomState: { ...defaultRoomState },
  bosses: makeInitialBosses(),
};

// Defaults consistent with App.jsx
const selectedZone = 'random';
const session = { energy: 'normal', preferredQuestMinutes: 10 };

// Basic checks
assert.strictEqual(game.xp, 0, 'Initial XP should be 0');
assert.strictEqual(game.completedQuests, 0, 'Initial completedQuests should be 0');
assert.deepStrictEqual(game.completedQuestIds, [], 'No completed quests at start');
assert.deepStrictEqual(game.recentQuestIds, [], 'No recent quests at start');

// Ensure session defaults match expectation
assert.strictEqual(session.energy, 'normal');
assert.strictEqual(session.preferredQuestMinutes, 10);

// Ensure Smart Run (random) is the default selection conceptually
assert.strictEqual(selectedZone, 'random');

// Now request a quest from the engine. This should not trigger console.warn/error.
const quest = getNextQuest(selectedZone, game.roomState, game.completedQuestIds, game.recentQuestIds, null, session);

assert(quest, 'Expected a quest to be available on initial load');

console.log('Found quest:', quest.id, '-', quest.title);
console.log('PASS: initial load smoke test');

// restore console
console.warn = console._warn;
console.error = console._error;

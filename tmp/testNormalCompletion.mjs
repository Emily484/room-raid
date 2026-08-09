import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { getNextQuest, getAvailableQuests, explainQuestScore } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

function makeInitialBosses() {
  // replicate useGameState behavior
  return Object.fromEntries(
    quests
      .map(q => q.zoneId)
      .filter((v, i, a) => a.indexOf(v) === i)
      .map(zoneId => [zoneId, { hp: 100, maxHp: 100 }])
  );
}

console.log('Test: Normal completion updates XP, boss HP, concrete state, derived state, recent history, and next selection uses new state');

const quest = quests.find(q => q.id === 'textile-floor-clothes');
assert(quest, 'Sample quest textile-floor-clothes must exist');

// initial game
const game = {
  xp: 0,
  completedQuests: 0,
  completedQuestIds: [],
  recentQuestIds: [],
  roomState: clone(defaultRoomState),
  bosses: makeInitialBosses(),
};

const session = { energy: 'normal', preferredQuestMinutes: 10 };

// verify quest available
const avail = getAvailableQuests('random', game.roomState, game.completedQuestIds);
assert(avail.find(q => q.id === quest.id), 'Precondition failed: sample quest not available initially');

const derivedBefore = calculateDerivedState(game.roomState);

// pick a target quest whose score should change when floorClutter changes
const target = quests.find(q => q.id === 'floor-vacuum');
assert(target, 'Target quest floor-vacuum must exist');
const scoreBefore = explainQuestScore(target, game.roomState, game.recentQuestIds, session).total;

// Complete the normal variant
const variant = quest.variants.normal;
const xpEarned = variant.xp ?? 0;
const damage = variant.damage ?? 0;

// Apply effects and update game
const nextRoom = applyStateEffects(game.roomState, variant.stateEffects);
game.roomState = nextRoom;
game.xp += xpEarned;
game.completedQuests += 1;
game.recentQuestIds = [quest.id, ...game.recentQuestIds.filter(id => id !== quest.id)].slice(0,5);
game.bosses[quest.zoneId].hp = Math.max(0, game.bosses[quest.zoneId].hp - damage);
if (!quest.repeatable) {
  game.completedQuestIds.push(quest.id);
}

const derivedAfter = calculateDerivedState(game.roomState);

// Assertions: five updates
// 1) XP
assert.strictEqual(game.xp, xpEarned, 'XP did not increase correctly after completion');

// 2) boss HP
assert.strictEqual(game.bosses[quest.zoneId].hp, 100 - damage, 'Boss HP did not decrease correctly');

// 3) concrete state changed (clothingOnFloor decreased by 15)
const expectedClothing = Math.max(0, (defaultRoomState.clothingOnFloor ?? 0) + (variant.stateEffects.clothingOnFloor ?? 0));
assert.strictEqual(game.roomState.clothingOnFloor, expectedClothing, 'Concrete state clothingOnFloor not updated by variant');

// 4) derived changed (floorClutter should decrease)
assert(typeof derivedBefore.floorClutter === 'number', 'derivedBefore.floorClutter missing');
assert(typeof derivedAfter.floorClutter === 'number', 'derivedAfter.floorClutter missing');
assert(derivedAfter.floorClutter <= derivedBefore.floorClutter, 'Derived floorClutter did not decrease after completion');

// 5) recent history records quest id once
assert(game.recentQuestIds[0] === quest.id, 'recentQuestIds did not record quest id at front');
assert(game.recentQuestIds.filter(id => id === quest.id).length === 1, 'quest id appears multiple times in recentQuestIds');

// Next selection should be generated using new state: score for target should reflect new derived
const scoreAfter = explainQuestScore(target, game.roomState, game.recentQuestIds, session).total;
assert(scoreAfter !== scoreBefore, 'Target quest score did not change after room state update, suggesting selection did not use new state');

const nextQuest = getNextQuest('random', game.roomState, game.completedQuestIds, game.recentQuestIds, null, session);
assert(nextQuest, 'No next quest generated after completion');

// Ensure nextQuest is in the available pool for the updated state
const availAfter = getAvailableQuests('random', game.roomState, game.completedQuestIds);
assert(availAfter.find(q => q.id === nextQuest.id), 'Next quest returned was not from the available pool computed with updated state');

console.log('PASS: normal completion updated XP, boss HP, concrete state, derived state, recent history, and next selection used new state');

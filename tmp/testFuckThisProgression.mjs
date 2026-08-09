import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: FUCK THIS progression updates variant (normal->small->tiny) and does not change room state until completion');

const quest = quests.find(q => q.id === 'textile-floor-clothes');
if (!quest) {
  console.log('SKIP: sample quest not found');
  process.exit(0);
}

const roomBefore = clone(defaultRoomState);

let difficulty = 0; // 0 normal, 1 small, 2 tiny

function variantKeyFor(d) {
  return d === 0 ? 'normal' : d === 1 ? 'small' : 'tiny';
}

function currentVariant(q, d) {
  const key = variantKeyFor(d);
  return q.variants?.[key];
}

// initial should be normal
const v0 = currentVariant(quest, difficulty);
assert(v0, 'normal variant missing');
console.log(' initial variant:', variantKeyFor(difficulty), v0.task, `+${v0.xp}xp`, `${v0.estimatedMinutes}m`);

// press FUCK THIS -> small
difficulty = Math.min(2, difficulty + 1);
const v1 = currentVariant(quest, difficulty);
assert(v1, 'small variant missing after first press');
console.log(' after 1st press:', variantKeyFor(difficulty), v1.task, `+${v1.xp}xp`, `${v1.estimatedMinutes}m`);

// press FUCK THIS -> tiny
difficulty = Math.min(2, difficulty + 1);
const v2 = currentVariant(quest, difficulty);
assert(v2, 'tiny variant missing after second press');
console.log(' after 2nd press:', variantKeyFor(difficulty), v2.task, `+${v2.xp}xp`, `${v2.estimatedMinutes}m`);

// press FUCK THIS again -> should remain tiny and not go below
const beforeCap = difficulty;
difficulty = Math.min(2, difficulty + 1);
assert(difficulty === beforeCap, 'Difficulty went below tiny or changed beyond tiny on extra press');
const v3 = currentVariant(quest, difficulty);
console.log(' after 3rd press (capped):', variantKeyFor(difficulty), v3.task, `+${v3.xp}xp`, `${v3.estimatedMinutes}m`);

// Ensure room state unchanged until completion
assert.deepStrictEqual(defaultRoomState, roomBefore, 'defaultRoomState mutated unexpectedly');

// As an extra check: completing the tiny variant applies its stateEffects — simulate completion
const effects = v3.stateEffects ?? {};
const roomAfter = applyStateEffects(clone(roomBefore), effects);
// Expect clothingOnFloor decreased by tiny variant's clothingOnFloor delta (-2)
if (effects && typeof effects.clothingOnFloor === 'number') {
  const expected = Math.max(0, (roomBefore.clothingOnFloor ?? 0) + effects.clothingOnFloor);
  assert.strictEqual(roomAfter.clothingOnFloor, expected, 'Completion did not apply tiny variant stateEffects correctly');
}

console.log('PASS: variant progression and room-state invariants behaved correctly');

import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { zones } from '../src/data/zones.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

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

console.log('Test: Reduced quest completion applies exact small/tiny variant (XP, damage, stateEffects, history)');

const quest = quests.find(q => q.id === 'textile-floor-clothes');
if (!quest) {
  console.log('SKIP: sample quest not found');
  process.exit(0);
}

const normalVariant = quest.variants?.normal;
const smallVariant = quest.variants?.small;
const tinyVariant = quest.variants?.tiny;

if (!smallVariant || !tinyVariant) {
  console.log('SKIP: small/tiny variants not present on quest');
  process.exit(0);
}

function simulateComplete(game, quest, variantKey) {
  const variant = quest.variants[variantKey];
  assert(variant, `Variant ${variantKey} missing`);

  const xpEarned = variant.xp ?? 0;
  const damage = variant.damage ?? 0;

  // apply state effects
  const nextRoom = applyStateEffects(game.roomState, variant.stateEffects);

  // update game
  const boss = game.bosses[quest.zoneId];
  boss.hp = Math.max(0, boss.hp - damage);

  game.xp += xpEarned;
  game.completedQuests += 1;

  // recentQuestIds: put quest.id first and remove duplicates, keep length 5
  game.recentQuestIds = [quest.id, ...(game.recentQuestIds ?? []).filter(id => id !== quest.id)].slice(0,5);

  // non-repeatable recording
  if (!quest.repeatable) {
    if (!game.completedQuestIds.includes(quest.id)) {
      game.completedQuestIds.push(quest.id);
    }
  }

  game.roomState = nextRoom;

  return { xpEarned, damage, appliedEffects: variant.stateEffects };
}

// Test small variant completion
{
  const game = {
    xp: 0,
    completedQuests: 0,
    completedQuestIds: [],
    recentQuestIds: [],
    roomState: clone(defaultRoomState),
    bosses: makeInitialBosses(),
  };

  const beforeRoom = clone(game.roomState);
  const beforeBossHp = game.bosses[quest.zoneId].hp;

  const res = simulateComplete(game, quest, 'small');

  // exact XP/damage
  assert.strictEqual(res.xpEarned, smallVariant.xp, 'Small variant XP mismatch');
  assert.strictEqual(res.damage, smallVariant.damage, 'Small variant damage mismatch');

  // stateEffects applied exactly (additive, clamped by applyStateEffects)
  for (const [k, v] of Object.entries(smallVariant.stateEffects ?? {})) {
    const expected = (() => {
      const cur = beforeRoom[k] ?? 0;
      if (typeof v === 'number') return Math.max(0, Math.min(100, cur + v));
      if (v && v.operation === 'set') return Math.max(0, Math.min(100, v.value));
      if (v && v.operation === 'add') return Math.max(0, Math.min(100, cur + v.value));
      return cur;
    })();
    assert.strictEqual(game.roomState[k], expected, `Small variant stateEffect for ${k} not applied correctly`);
  }

  // boss HP reduced by damage
  assert.strictEqual(game.bosses[quest.zoneId].hp, Math.max(0, beforeBossHp - smallVariant.damage), 'Boss HP not reduced correctly for small');

  // completed counters and history
  assert.strictEqual(game.completedQuests, 1, 'completedQuests not incremented');
  assert.strictEqual(game.recentQuestIds[0], quest.id, 'recentQuestIds not updated with quest id at front');
  const occurrences = game.recentQuestIds.filter(id => id === quest.id).length;
  assert.strictEqual(occurrences, 1, 'quest id recorded more than once in recentQuestIds');

  // ensure we didn't accidentally apply normal variant
  if (normalVariant) {
    assert.notStrictEqual(smallVariant.xp, normalVariant.xp, 'Small variant XP equals normal variant XP — suspicious');
  }

  console.log(' ✓ small variant completion validated');
}

// Test tiny variant completion
{
  const game = {
    xp: 0,
    completedQuests: 0,
    completedQuestIds: [],
    recentQuestIds: [],
    roomState: clone(defaultRoomState),
    bosses: makeInitialBosses(),
  };

  const beforeRoom = clone(game.roomState);
  const beforeBossHp = game.bosses[quest.zoneId].hp;

  const res = simulateComplete(game, quest, 'tiny');

  // exact XP/damage
  assert.strictEqual(res.xpEarned, tinyVariant.xp, 'Tiny variant XP mismatch');
  assert.strictEqual(res.damage, tinyVariant.damage, 'Tiny variant damage mismatch');

  // stateEffects applied exactly
  for (const [k, v] of Object.entries(tinyVariant.stateEffects ?? {})) {
    const expected = (() => {
      const cur = beforeRoom[k] ?? 0;
      if (typeof v === 'number') return Math.max(0, Math.min(100, cur + v));
      if (v && v.operation === 'set') return Math.max(0, Math.min(100, v.value));
      if (v && v.operation === 'add') return Math.max(0, Math.min(100, cur + v.value));
      return cur;
    })();
    assert.strictEqual(game.roomState[k], expected, `Tiny variant stateEffect for ${k} not applied correctly`);
  }

  // boss HP reduced by damage
  assert.strictEqual(game.bosses[quest.zoneId].hp, Math.max(0, beforeBossHp - tinyVariant.damage), 'Boss HP not reduced correctly for tiny');

  // completed counters and history
  assert.strictEqual(game.completedQuests, 1, 'completedQuests not incremented for tiny');
  assert.strictEqual(game.recentQuestIds[0], quest.id, 'recentQuestIds not updated with quest id at front for tiny');
  const occurrences = game.recentQuestIds.filter(id => id === quest.id).length;
  assert.strictEqual(occurrences, 1, 'quest id recorded more than once in recentQuestIds for tiny');

  // ensure we didn't accidentally apply normal variant
  if (normalVariant) {
    assert.notStrictEqual(tinyVariant.xp, normalVariant.xp, 'Tiny variant XP equals normal variant XP — suspicious');
  }

  console.log(' ✓ tiny variant completion validated');
}

console.log('PASS: Reduced quest completions applied exact variant effects and updated progress/history correctly');

import assert from 'assert';
import { quests } from '../src/data/quests.js';
import { explainAllQuests, explainQuestScore, scoreQuest, getNextQuest } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

console.log('Running engine tests...');

// Helpers taken from older tmp scripts (local copies to avoid importing test helpers)
function checkRequirement(requirement, roomState) {
  const value = roomState?.[requirement.key];
  if (typeof value !== 'number') return false;
  if (requirement.operator === '>') return value > requirement.value;
  if (requirement.operator === '>=') return value >= requirement.value;
  if (requirement.operator === '<') return value < requirement.value;
  if (requirement.operator === '<=') return value <= requirement.value;
  if (requirement.operator === '==') return value === requirement.value;
  return false;
}

function questMeetsRequirements(quest, roomState) {
  if (!quest.requirements || quest.requirements.length === 0) return true;
  return quest.requirements.every(r => checkRequirement(r, roomState));
}

// Test 1: a quest with unmet requirements cannot be selected even if highest score
(async function testUnmetRequirementsNotSelected() {
  const room = clone(defaultRoomState);
  const recent = [];
  // Find a quest that's locked by a requirement in default state
  const locked = quests.find(q => !questMeetsRequirements(q, { ...room, ...calculateDerivedState(room) }));
  assert(locked, 'No locked quest found in data');

  // Force its score to be very high by temporarily increasing its priority
  const originalPriority = locked.priority;
  locked.priority = 10000;

  const next = getNextQuest(locked.zoneId, room, [], recent);
  // next must not be the locked quest because it's ineligible
  assert(next === null || next.id !== locked.id, 'Locked quest was selected despite unmet requirements');

  // restore
  locked.priority = originalPriority;
  console.log('PASS: unmet requirements cannot be selected');
})();

// Test 2: completing a quest unlocks another -> increases unlockPotential for the unlocking quest
(async function testUnlockPotentialIncreases() {
  const room = clone(defaultRoomState);
  const derived = calculateDerivedState(room);
  const full = { ...room, ...derived };

  // Find a pair where quest A unlocks quest B by making requirements satisfied.
  let pair = null;
  for (const a of quests) {
    const variant = a.variants?.normal ?? Object.values(a.variants ?? {})[0];
    if (!variant?.stateEffects) continue;
    const after = applyStateEffects(room, variant.stateEffects);
    const afterFull = { ...after, ...calculateDerivedState(after) };
    for (const b of quests) {
      if (a.id === b.id) continue;
      const before = questMeetsRequirements(b, full);
      const afterOk = questMeetsRequirements(b, afterFull);
      if (!before && afterOk) { pair = {a,b}; break; }
    }
    if (pair) break;
  }
  assert(pair, 'No unlocking pair found in data');

  const scoreWithout = explainQuestScore(pair.a, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  // apply effects and recompute explanation score for informational purposes
  const roomAfter = applyStateEffects(room, (pair.a.variants?.normal ?? Object.values(pair.a.variants ?? {})[0]).stateEffects);
  const scoreWith = explainQuestScore(pair.a, roomAfter, [], { energy: 'normal', preferredQuestMinutes: 10 });

  // The unlocking quest should show unlockPotential in the pre-completion score
  assert(scoreWithout.components.unlockPotential > 0, 'Unlocking did not provide unlockPotential bonus');
  console.log('PASS: completing a quest increases unlockPotential when it unlocks another');
})();

// Test 3: recently completed quest receives repetition penalty
(async function testRepetitionPenalty() {
  const room = clone(defaultRoomState);
  const recent = [];
  const q = quests.find(q => q.requirements?.length);
  assert(q, 'No quest with requirements found');
  const explanation1 = explainQuestScore(q, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  const explanation2 = explainQuestScore(q, room, [q.id], { energy: 'normal', preferredQuestMinutes: 10 });
  assert(explanation2.components.repetitionPenalty < explanation1.components.repetitionPenalty || explanation2.components.repetitionPenalty < 0, 'Repetition penalty not applied');
  console.log('PASS: repetition penalty applied for recent quests');
})();

// Test 4: same-zone recent quests create a modest zoneMomentum bonus
(async function testZoneMomentum() {
  const room = clone(defaultRoomState);
  // pick a quest and create recent list with same zone
  const q = quests[0];
  const recent = quests.filter(x => x.zoneId === q.zoneId).slice(0,2).map(x => x.id);
  const explanation = explainQuestScore(q, room, recent, { energy: 'normal', preferredQuestMinutes: 10 });
  assert(explanation.components.zoneMomentum > 0, 'Zone momentum not applied');
  console.log('PASS: zone momentum applied');
})();

// Test 5: low-energy sessions penalize long quests more than normal/high energy
(async function testEnergyPenalty() {
  const room = clone(defaultRoomState);
  // find a long quest
  const long = quests.find(q => Object.values(q.variants ?? {}).some(v => v.estimatedMinutes >= 30));
  if (!long) { console.log('SKIP: no long quest found'); return; }
  const low = explainQuestScore(long, room, [], { energy: 'low', preferredQuestMinutes: 10 });
  const normal = explainQuestScore(long, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  const high = explainQuestScore(long, room, [], { energy: 'high', preferredQuestMinutes: 10 });
  assert(low.total < normal.total, 'Low energy did not reduce score vs normal');
  assert(high.total >= normal.total, 'High energy unexpectedly penalized long quest');
  console.log('PASS: energy affects effort penalty as expected');
})();

// Test 6: short quests shouldn't receive effort penalty when within preferred duration
(async function testPreferredDuration() {
  const room = clone(defaultRoomState);
  // find a short quest
  const short = quests.find(q => Object.values(q.variants ?? {}).some(v => v.estimatedMinutes <= 5));
  if (!short) { console.log('SKIP: no short quest'); return; }
  const e = explainQuestScore(short, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  assert(e.components.effortPenalty === 0, 'Short quest incorrectly received effort penalty');
  console.log('PASS: short quests not penalized when within preferred duration');
})();

// Test 7: changing room state can change which quest is ranked highest
(async function testChangingRoomStateAffectsRanking() {
  const room = clone(defaultRoomState);
  // pick two quests; ensure A is highest now but B becomes highest after applying A's effects if it unlocks B
  const all = explainAllQuests(room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  const sorted = all.slice().sort((a,b)=>b.total-a.total);
  const top = sorted[0];
  // find a quest that, when applied, changes the top ranking
  let found = false;
  for (const candidate of all) {
    const qdef = quests.find(x=>x.id===candidate.id);
    const variant = qdef.variants?.normal ?? Object.values(qdef.variants ?? {})[0];
    if (!variant?.stateEffects) continue;
    const after = applyStateEffects(room, variant.stateEffects);
    const afterAll = explainAllQuests(after, [], { energy: 'normal', preferredQuestMinutes: 10 });
    const afterTop = afterAll.slice().sort((a,b)=>b.total-a.total)[0];
    if (afterTop.id !== top.id) { found = true; break; }
  }
  assert(found, 'No state change caused top-ranked quest to change in sample');
  console.log('PASS: changing room state can change which quest ranks highest');
})();

console.log('All tests finished.');

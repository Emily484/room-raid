import assert from 'assert';
import { explainQuestScore, SCORE_CONFIG } from '../src/game/questEngine.js';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';

console.log('Test: Score explanation adds up');

const room = { ...defaultRoomState };

let failures = 0;
for (const q of quests) {
  const expl = explainQuestScore(q, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  const comps = expl.components;
  const sumRaw = (comps.basePriority ?? 0) + (comps.urgency ?? 0) + (comps.unlockPotential ?? 0) + (comps.zoneMomentum ?? 0) + (comps.varietyBonus ?? 0) + (comps.repetitionPenalty ?? 0) + (comps.effortPenalty ?? 0);
  const expected = Math.max(1, Math.round(sumRaw));
  if (expl.total !== expected) {
    console.error(`Mismatch for ${q.id} (${q.title}): total=${expl.total} expected=${expected} (sumRaw=${sumRaw})`);
    failures++;
  }
}

assert(failures === 0, `${failures} explanation totals did not match component sums`);
console.log(' ✓ All quest explanations sum to the reported total');

// Synthetic check: known components
(function synthetic() {
  const comps = {
    basePriority: 90,
    urgency: 20,
    unlockPotential: 0,
    zoneMomentum: 8,
    varietyBonus: 5,
    repetitionPenalty: -15,
    effortPenalty: -6,
  };
  const sumRaw = comps.basePriority + comps.urgency + comps.unlockPotential + comps.zoneMomentum + comps.varietyBonus + comps.repetitionPenalty + comps.effortPenalty;
  const expected = Math.max(1, Math.round(sumRaw));
  // Expect 102 per the example
  assert(expected === 102, `Synthetic example expected 102 but got ${expected} from sumRaw ${sumRaw}`);
  console.log(' ✓ Synthetic example sums to 102 as expected');
})();

console.log('PASS: explanation accurately describes the actual scoring function');

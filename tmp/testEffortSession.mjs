import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { explainQuestScore, questMeetsRequirements } from '../src/game/questEngine.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Effort/session logic (low short session vs high long session)');

// Synthetic short and long quests (minimal requirements so both are eligible)
const shortQuest = {
  id: 'short-quick-task',
  title: 'Quick Tidy',
  priority: 50,
  variants: {
    normal: { estimatedMinutes: 2 }
  }
};

const longQuest = {
  id: 'long-deep-task',
  title: 'Deep Clean',
  priority: 50,
  variants: {
    normal: { estimatedMinutes: 15 }
  }
};

const room = clone(defaultRoomState);
const full = { ...room };

// Sessions
const shortSession = { energy: 'low', preferredQuestMinutes: 3 };
const longSession = { energy: 'high', preferredQuestMinutes: 15 };

const explShortLow = explainQuestScore(shortQuest, full, [], shortSession);
const explLongLow = explainQuestScore(longQuest, full, [], shortSession);

console.log(' Low session: short effortPenalty=', explShortLow.components.effortPenalty, ' long effortPenalty=', explLongLow.components.effortPenalty);

// Expected: short not penalized, long penalized heavily
assert.strictEqual(explShortLow.components.effortPenalty, 0, 'Short quest should not be penalized in short session');
assert(explLongLow.components.effortPenalty < -5, 'Long quest should receive a significant penalty in short/low session');

// Totals: short should beat long in low session
assert(explShortLow.total > explLongLow.total, 'Short task should be preferred in a short/low session');
console.log(' ✓ Low session ranking behaves as expected');

// High/long session
const explShortHigh = explainQuestScore(shortQuest, full, [], longSession);
const explLongHigh = explainQuestScore(longQuest, full, [], longSession);

console.log(' High session: short effortPenalty=', explShortHigh.components.effortPenalty, ' long effortPenalty=', explLongHigh.components.effortPenalty);

assert.strictEqual(explShortHigh.components.effortPenalty, 0, 'Short quest should not be penalized in long/high session');
assert(Math.abs(explLongHigh.components.effortPenalty) <= 1, 'Long quest should have little or no penalty in long/high session');

// Totals: long should be >= short (not penalized)
assert(explLongHigh.total >= explShortHigh.total, 'Long task should not be disadvantaged in a long/high session');
console.log(' ✓ High session ranking behaves as expected');

// Eligibility shouldn't change
assert(questMeetsRequirements(shortQuest, full) === true, 'Short quest should remain eligible');
assert(questMeetsRequirements(longQuest, full) === true, 'Long quest should remain eligible');

console.log('PASS: effort/session logic changes ranking but not eligibility');

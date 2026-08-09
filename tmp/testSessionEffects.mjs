import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { explainQuestScore, questMeetsRequirements } from '../src/game/questEngine.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Session settings alter ranking (long vs short) but not eligibility or room state');

const shortQuest = {
  id: 'test-short',
  title: 'Quick Task',
  priority: 50,
  variants: { normal: { estimatedMinutes: 2, xp: 2, damage: 2 } }
};

const longQuest = {
  id: 'test-long',
  title: 'Long Task',
  priority: 50,
  variants: { normal: { estimatedMinutes: 15, xp: 20, damage: 10 } }
};

const room = clone(defaultRoomState);
const roomBefore = clone(room);

const energies = ['low','normal','high'];
const prefs = [2,5,10,15];

let lowPrefFails = 0;
let highPrefFails = 0;

for (const energy of energies) {
  for (const pref of prefs) {
    const session = { energy, preferredQuestMinutes: pref };

    const explShort = explainQuestScore(shortQuest, room, [], session);
    const explLong = explainQuestScore(longQuest, room, [], session);

    console.log(` session=${energy}/${pref}m => short.effort=${explShort.components.effortPenalty} total=${explShort.total}  long.effort=${explLong.components.effortPenalty} total=${explLong.total}`);

    // Eligibility unaffected (no requirements)
    assert(questMeetsRequirements(shortQuest, room) === true, 'short quest unexpectedly ineligible');
    assert(questMeetsRequirements(longQuest, room) === true, 'long quest unexpectedly ineligible');

    // Room unchanged
    assert.deepStrictEqual(room, roomBefore, 'room state changed during scoring');

    // In low/short sessions (energy low and pref small), long should lose ranking
    if (energy === 'low' && pref <= 3) {
      if (!(explLong.total < explShort.total)) lowPrefFails++;
    }

    // In high/long sessions (energy high and pref large), long should recover
    // We require the user-specified 15-minute preferred duration to consider a full recovery.
    if (energy === 'high' && pref >= 15) {
      if (!(explLong.total >= explShort.total)) highPrefFails++;
    }
  }
}

assert(lowPrefFails === 0, `Long task did not lose ranking in ${lowPrefFails} low/short cases`);
assert(highPrefFails === 0, `Long task did not recover in ${highPrefFails} high/long cases`);

console.log('PASS: session changes affect ranking/selection but not eligibility or room state');

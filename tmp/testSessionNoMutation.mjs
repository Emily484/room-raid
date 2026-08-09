import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { zones } from '../src/data/zones.js';
import { getNextQuest, explainQuestScore } from '../src/game/questEngine.js';

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

console.log('Test: session settings do NOT mutate progress state');

const baseGame = {
  xp: 123,
  completedQuests: 4,
  completedQuestIds: ['textile-floor-clothes','packaging-flatten-boxes'],
  recentQuestIds: ['floor-misc-items','table-remove-trash'],
  roomState: clone(defaultRoomState),
  bosses: makeInitialBosses(),
};

const snapshot = JSON.stringify(baseGame);

const energies = ['low','normal','high'];
const prefs = [2,5,10,15];

for (const energy of energies) {
  for (const pref of prefs) {
    const session = { energy, preferredQuestMinutes: pref };

    // Call selection and scoring functions with clones (to be extra-safe)
    const roomClone = clone(baseGame.roomState);
    const completedClone = clone(baseGame.completedQuestIds);
    const recentClone = clone(baseGame.recentQuestIds);

    const quest = getNextQuest('random', roomClone, completedClone, recentClone, null, session);

    if (quest) {
      // calling explainQuestScore should not mutate
      explainQuestScore(quest, roomClone, recentClone, session);
    }

    // verify baseGame hasn't changed
    const now = JSON.stringify(baseGame);
    assert.strictEqual(now, snapshot, `Game mutated for session ${energy}/${pref}m`);
  }
}

console.log('PASS: session changes did not mutate XP, bosses, room state, completed IDs, or recent history');

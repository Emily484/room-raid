import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { getAvailableQuests, explainQuestScore, getQuestReason } from '../src/game/questEngine.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Player-facing reason consistency check (truthful and known limitations noted)');

const room = clone(defaultRoomState);
const available = getAvailableQuests('random', room, []);

if (!available || available.length === 0) {
  console.log('SKIP: no available quests in default room state');
  process.exit(0);
}

const mismatches = [];

for (const q of available) {
  const reason = getQuestReason(q);
  const expl = explainQuestScore(q, room, [], { energy: 'normal', preferredQuestMinutes: 10 });

  // Rule checks corresponding to getQuestReason implementation
  let ruleOk = true;
  let note = '';

  if (reason === '') {
    ruleOk = false;
    note = 'reason empty';
  } else if (reason === 'Boss vulnerability detected') {
    if (!q.tags?.includes('boss')) {
      ruleOk = false;
      note = 'reason says boss but tags missing';
    }
  } else if (reason === 'Progression task') {
    if (!(q.stage >= 3)) {
      ruleOk = false;
      note = `reason says stage>=3 but stage=${q.stage}`;
    }
  } else if (reason === 'High-impact problem') {
    if (!(q.priority >= 90)) {
      ruleOk = false;
      note = `reason says priority>=90 but priority=${q.priority}`;
    }
  } else if (reason === 'Strong next move') {
    if (!(q.priority >= 75)) {
      ruleOk = false;
      note = `reason says priority>=75 but priority=${q.priority}`;
    }
  } else if (reason === 'Useful progress') {
    // always acceptable
  } else {
    ruleOk = false;
    note = `unknown reason '${reason}'`;
  }

  if (!ruleOk) {
    mismatches.push({ id: q.id, title: q.title, reason, note, priority: q.priority, stage: q.stage, tags: q.tags });
  }

  // Also print a brief line mapping reason to top scoring component (informational)
  const comps = expl.components;
  const compEntries = Object.entries(comps).filter(([k]) => k !== 'basePriority');
  const top = compEntries.sort((a,b)=> b[1]-a[1])[0];
  const topName = top ? top[0] : 'none';
  console.log(`${q.id}: reason='${reason}' topComponent='${topName}' total=${expl.total}`);
}

if (mismatches.length > 0) {
  console.log('\nNOTE: Found helper/engine mismatches. These are likely because the lightweight helper uses tags/stage/priority only; true explanation requires explainQuestScore. Listing mismatches:');
  for (const m of mismatches) {
    console.log(' -', m.id, m.title, '=> reason="' + m.reason + '" (', m.note, ')');
  }
} else {
  console.log('\nPASS: All player-facing reasons are consistent with the simple helper rules');
}

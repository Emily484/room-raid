const { quests } = await import(new URL('../../src/data/quests.js', import.meta.url));
const { getAvailableQuests, scoreQuest, getNextQuest, questMeetsRequirements, explainQuestScore, checkRequirement } = await import(new URL('../../src/game/questEngine.js', import.meta.url));

// Build a roomState from provided approximations
const roomState = {
  surfaceClutter: 14,
  loungeClutter: 18.5,
  shelfDisorganization: 40,
  mirrorDirty: 45,
  tubClutter: 9,
  floorObstruction: 32.5,
  loosePackaging: 8.5,
  // Add clothing fields used by textile quests
  clothingOnFloor: 10,
  looseClothing: 8,
  cleanClothesOut: 6,
  // some other typical fields
  tableTrash: 0,
  floorTrash: 0,
  miscellaneousFloorItems: 0,
};

const zoneId = null; // consider selection across all zones (null = random)
const completedQuestIds = [];
const recentQuestIds = [];
const session = { energy: 'normal', preferredQuestMinutes: 10 };
const recentRejected = ['textile-clean-clothes','textile-dirty-laundry'];

console.log('--- ROOM STATE ---');
console.log(roomState);

console.log('\n--- AVAILABLE QUESTS (zone random / all) BEFORE rejection filtering ---');
const available = getAvailableQuests(zoneId, roomState, completedQuestIds);
for (const q of available) {
  const meets = questMeetsRequirements(q, roomState);
  console.log(`- ${q.id}: ${q.title} | eligible=${meets}`);
}

console.log('\n--- Detailed eligibility and scores for available quests ---');
const scored = available.map(q => {
  const s = scoreQuest(q, roomState, recentQuestIds, session);
  // list requirement pass/fail
  const reqs = (q.requirements || []).map(r => ({...r, passed: checkRequirement(r, roomState)}));
  return { id: q.id, title: q.title, score: s, reqs };
}).sort((a,b) => b.score - a.score);

for (const c of scored) {
  console.log(`\n* ${c.id} - ${c.title}`);
  console.log(`  score: ${c.score}`);
  console.log('  requirements:');
  for (const r of c.reqs) {
    console.log(`    - ${r.key} ${r.operator} ${r.value} => ${r.passed}`);
  }
}

console.log('\n--- Candidate list after applying recentRejected [' + recentRejected.join(',') + '] ---');
let candidates = scored.slice(0,3).map(x => ({ id: x.id, title: x.title, score: x.score }));
console.log('Top candidates (pre-filter):', candidates.map(c => c.id));

const filtered = candidates.filter(c => !recentRejected.includes(c.id));
console.log('Filtered candidates (excluded recentRejected):', filtered.map(c => c.id));
console.log('Filtered candidates empty?', filtered.length === 0);

console.log('\n--- getNextQuest result passing recentRejected into engine ---');
const pick = getNextQuest(zoneId, roomState, completedQuestIds, recentQuestIds, null, session, recentRejected);
console.log('Engine pick:', pick ? `${pick.id} - ${pick.title}` : 'null');

console.log('\n--- For all quests, list whether they are eligible and their scores (zone textile-wastes) ---');
for (const q of quests.filter(q=> q.zoneId === zoneId)) {
  const eligible = getAvailableQuests(zoneId, roomState, completedQuestIds).some(a=>a.id===q.id);
  const score = eligible ? scoreQuest(q, roomState, recentQuestIds, session) : null;
  console.log(`${q.id} | eligible=${eligible} | score=${score}`);
}

console.log('\n--- END ---');

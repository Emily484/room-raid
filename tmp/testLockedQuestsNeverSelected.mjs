import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { explainAllQuests, getNextQuest } from '../src/game/questEngine.js';
import { quests } from '../src/data/quests.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Locked quests can never be selected (repeat rerolls)');

(async function(){
  const room = clone(defaultRoomState);

  // find a locked quest
  const explanations = explainAllQuests(room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  const locked = explanations.find(e => !e.eligible);
  if (!locked) { console.log('SKIP: No locked quest found in current data'); return; }

  console.log(' Found locked quest:', locked.id, locked.title, 'zone:', locked.zone);

  // choose its zone and ensure there are other available quests in that zone
  const zoneId = locked.zone;
  const availableNow = explainAllQuests(room, [], { energy: 'normal', preferredQuestMinutes: 10 }).filter(q => q.eligible && q.zone === zoneId);

  if (availableNow.length === 0) {
    console.log('SKIP: No available quests in same zone to reroll against; test requires alternatives');
    return;
  }

  // temporarily boost locked quest's priority to make it hypothetically highest-scoring
  const qObj = quests.find(q => q.id === locked.id);
  const originalPriority = qObj.priority;
  qObj.priority = (originalPriority ?? 50) + 10000;

  // run many getNextQuest calls and ensure locked quest never returned
  const iterations = 50;
  let selectedLocked = 0;
  const picks = {};

  for (let i = 0; i < iterations; i++) {
    const pick = getNextQuest(zoneId, room, [], [], null, { energy: 'normal', preferredQuestMinutes: 10 });
    if (!pick) {
      // No pick available (shouldn't happen since we checked availableNow), continue
      continue;
    }
    picks[pick.id] = (picks[pick.id] || 0) + 1;
    if (pick.id === locked.id) selectedLocked++;
  }

  // restore priority
  qObj.priority = originalPriority;

  console.log('Reroll picks distribution (sample):', picks);
  assert(selectedLocked === 0, `Locked quest was selected ${selectedLocked} times (expected 0)`);

  console.log(`PASS: Locked quest (${locked.title}) was never selected in ${iterations} rerolls`);
})();

import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { scoreQuest } from '../src/game/questEngine.js';

const session = { energy: 'normal', preferredQuestMinutes: 5 };
const recent = [];

for (const q of quests.slice(0, 12)) {
  console.log(q.id, q.title, '->', scoreQuest(q, defaultRoomState, recent, session));
}

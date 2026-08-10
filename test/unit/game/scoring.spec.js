import { describe, it } from 'vitest';
import { defaultRoomState } from '../../../src/data/defaultRoomState.js';
import { quests } from '../../../src/data/quests.js';
import { scoreQuest } from '../../../src/game/questEngine.js';

describe('scoring smoke', () => {
  it('prints a selection of scores (smoke)', () => {
    const session = { energy: 'normal', preferredQuestMinutes: 5 };
    const recent = [];
    for (const q of quests.slice(0, 12)) {
      scoreQuest(q, defaultRoomState, recent, session);
    }
  });
});

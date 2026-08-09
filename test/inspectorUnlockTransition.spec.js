import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { quests } from '../src/data/quests.js';
import { explainAllQuests, getNextQuest, getAvailableQuests } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('inspector unlock transition', () => {
  it('LOCKED -> AVAILABLE and UI sees change without reload', () => {
    const lockedQuest = quests.find(q => q.id === 'table-wipe');
    expect(lockedQuest).toBeTruthy();

    const room = clone(defaultRoomState);
    room.surfaceClutter = 22;
    room.surfaceCleanliness = 50;
    room.exposedSurface = 70;

    const explBefore = explainAllQuests(room, []);
    const entryBefore = explBefore.find(e => e.id === lockedQuest.id);
    expect(entryBefore).toBeTruthy();
    expect(entryBefore.eligible).toBe(false);

    const delta = 20 - room.surfaceClutter;
    const roomAfter = applyStateEffects(room, { surfaceClutter: delta });

    const explAfter = explainAllQuests(roomAfter, []);
    const entryAfter = explAfter.find(e => e.id === lockedQuest.id);
    expect(entryAfter).toBeTruthy();
    expect(entryAfter.eligible).toBe(true);

    const availAfter = getAvailableQuests('random', roomAfter, []);
    expect(availAfter.find(q => q.id === lockedQuest.id)).toBeTruthy();

    const next = getNextQuest('random', roomAfter, [], [], null, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(next).toBeTruthy();
    expect(availAfter.some(q => q.id === next.id)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { explainQuestScore } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { quests } from '../src/data/quests.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('inspector scoring', () => {
  it('scoring reacts logically to manual corrections', () => {
    const room = clone(defaultRoomState);
    const quest = quests.find(q => q.id === 'textile-floor-clothes');
    expect(quest).toBeTruthy();

    const explain0 = explainQuestScore(quest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
    const increasedVal = Math.min(100, (room.clothingOnFloor ?? 0) + 25);
    const roomInc = applyStateEffects(room, { clothingOnFloor: { operation: 'set', value: increasedVal } });
    const explainInc = explainQuestScore(quest, roomInc, [], { energy: 'normal', preferredQuestMinutes: 10 });

    expect(explainInc.components.urgency).toBeGreaterThan(explain0.components.urgency);
    expect(explainInc.total).toBeGreaterThan(explain0.total);

    const roomDec = applyStateEffects(roomInc, { clothingOnFloor: { operation: 'set', value: 0 } });
    const explainDec = explainQuestScore(quest, roomDec, [], { energy: 'normal', preferredQuestMinutes: 10 });

    expect(explainDec.components.urgency).toBeLessThan(explainInc.components.urgency);
    expect(explainDec.total).toBeLessThan(explainInc.total);
  });
});

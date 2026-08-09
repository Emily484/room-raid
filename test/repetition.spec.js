import { describe, it, expect } from 'vitest';
import { quests } from '../src/data/quests.js';
import { explainQuestScore } from '../src/game/questEngine.js';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

describe('repetition penalty', () => {
  it('applies immediately and decays when aged', () => {
    const room = JSON.parse(JSON.stringify(defaultRoomState));
    const quest = quests.find(q => q.repeatable && typeof q.id === 'string');
    expect(quest).toBeTruthy();

    const baseExpl = explainQuestScore(quest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
    expect(baseExpl.components.repetitionPenalty).toBe(0);

    const recent1 = [quest.id];
    const expl1 = explainQuestScore(quest, room, recent1, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(expl1.components.repetitionPenalty).toBeLessThan(0);

    const others = quests.filter(q => q.id !== quest.id).slice(0, 3).map(q => q.id);
    const recent2 = [others[0], others[1], quest.id];
    const expl2 = explainQuestScore(quest, room, recent2, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(expl2.components.repetitionPenalty).toBeGreaterThan(expl1.components.repetitionPenalty);

    const recent3 = [others[0], others[1], others[2]];
    const expl3 = explainQuestScore(quest, room, recent3, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(expl3.components.repetitionPenalty).toBe(0);
  });
});

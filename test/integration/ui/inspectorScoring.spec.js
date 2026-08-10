import { describe, it, expect } from 'vitest';
import { explainQuestScore } from '../../../src/game/questEngine.js';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { quests } from '../../../src/data/quests.js';
import { mkRoom, est } from '../../test-utils.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('inspector scoring', () => {
  it('scoring reacts logically to manual corrections', () => {
  const room = mkRoom();
    const quest = quests.find(q => q.id === 'textile-floor-clothes');
    expect(quest).toBeTruthy();
  const explain0 = explainQuestScore(quest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
  // clothingOnFloor is a raw/count-based field; don't clamp to 100 here — increase by 25
  const increasedVal = est(room, 'clothingOnFloor') + 25;
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

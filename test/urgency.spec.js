import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { explainQuestScore } from '../src/game/questEngine.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { quests } from '../src/data/quests.js';

describe('urgency monotonicity', () => {
  it('clothing urgency increases as clothingOnFloor increases', () => {
    const clothingQuest = quests.find(q => q.id === 'textile-floor-clothes');
    expect(clothingQuest).toBeTruthy();
    const clothingValues = [20, 50, 90];
    const clothingUrgencies = [];
    let base = JSON.parse(JSON.stringify(defaultRoomState));
    for (const v of clothingValues) {
      const room = applyStateEffects(base, { clothingOnFloor: { operation: 'set', value: v } });
      const expl = explainQuestScore(clothingQuest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
      clothingUrgencies.push(expl.components.urgency);
    }
    expect(clothingUrgencies[0]).toBeLessThan(clothingUrgencies[1]);
    expect(clothingUrgencies[1]).toBeLessThan(clothingUrgencies[2]);
  });

  it('cleanliness urgency increases as cleanliness worsens', () => {
    const tubQuest = quests.find(q => q.id === 'bathroom-tub-clean');
    expect(tubQuest).toBeTruthy();
    const cleanlinessValues = [90, 50, 20];
    const cleanlinessUrgencies = [];
    let base = JSON.parse(JSON.stringify(defaultRoomState));
    for (const v of cleanlinessValues) {
      const room = applyStateEffects(base, { tubCleanliness: { operation: 'set', value: v } });
      const expl = explainQuestScore(tubQuest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
      cleanlinessUrgencies.push(expl.components.urgency);
    }
    expect(cleanlinessUrgencies[0]).toBeLessThan(cleanlinessUrgencies[1]);
    expect(cleanlinessUrgencies[1]).toBeLessThan(cleanlinessUrgencies[2]);
  });
});

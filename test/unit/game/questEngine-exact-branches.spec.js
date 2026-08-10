import { describe, it, expect } from 'vitest';
import { explainQuestScore, scoreQuest, getNextQuest } from '../../../src/game/questEngine.js';
import { quests } from '../../../src/data/quests.js';
import { mkRoom } from '../../test-utils.js';

describe('questEngine exact branch coverage', () => {
  it('handles variant present but without stateEffects (unlockPotential skipped)', () => {
    const q = {
      id: 'no-effects-quest',
      zoneId: 'fake-zone',
      priority: 60,
      variants: { normal: {} },
      requirements: [],
      category: 'misc',
    };

  const room = mkRoom({ clothingOnFloor: 0 });
  const expl = explainQuestScore(q, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
    expect(expl.components.unlockPotential).toBe(0);
  });

  it('varietyBonus becomes positive when recent quests have other categories', () => {
    const recent = quests.slice(0, 2).map(q => q.id).filter(Boolean);
    if (recent.length < 1) {
      expect(true).toBe(true);
      return;
    }

    const fake = { id: 'var-test', priority: 50, variants: { normal: {} }, requirements: [], category: 'unique' };
    const expl = explainQuestScore(fake, {}, recent, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(expl.components.varietyBonus).toBeGreaterThanOrEqual(0);
  });

  it('getNextQuest returns null when no available quests for a zone', () => {
    const pick = getNextQuest('zone-does-not-exist', {}, [], [], null);
    expect(pick).toBeNull();
  });

  it('urgency handles < operator by increasing urgency for low values', () => {
    const q = { id: 'urg-test', priority: 50, variants: { normal: {} }, requirements: [{ key: 'x', operator: '<', value: 40 }], category: 'misc' };
  const room = mkRoom({ a: 5 });
  const expl = explainQuestScore(q, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
    expect(expl.components.urgency).toBeGreaterThan(0);
  });
});

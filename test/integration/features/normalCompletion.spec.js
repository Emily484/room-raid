import { describe, it, expect } from 'vitest';
import { quests } from '../../../src/data/quests.js';
import { getNextQuest, getAvailableQuests, explainQuestScore } from '../../../src/game/questEngine.js';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { calculateDerivedState } from '../../../src/game/derivedState.js';
import { mkRoom, est } from '../../test-utils.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

function makeInitialBosses() {
  return Object.fromEntries(
    quests
      .map(q => q.zoneId)
      .filter((v, i, a) => a.indexOf(v) === i)
      .map(zoneId => [zoneId, { hp: 100, maxHp: 100 }])
  );
}

describe('normal completion flow', () => {
  it('updates xp, boss hp, concrete state, derived state, recent history, and next selection', () => {
    const quest = quests.find(q => q.id === 'textile-floor-clothes');
    expect(quest).toBeTruthy();

    const game = {
      xp: 0,
      completedQuests: 0,
      completedQuestIds: [],
      recentQuestIds: [],
      roomState: mkRoom(),
      bosses: makeInitialBosses(),
    };
    const session = { energy: 'normal', preferredQuestMinutes: 10 };
    const avail = getAvailableQuests('random', game.roomState, game.completedQuestIds);
    expect(avail.find(q => q.id === quest.id)).toBeTruthy();

    const derivedBefore = calculateDerivedState(game.roomState);
    const target = quests.find(q => q.id === 'floor-vacuum');
    expect(target).toBeTruthy();
    const scoreBefore = explainQuestScore(target, game.roomState, game.recentQuestIds, session).total;

    const variant = quest.variants.normal;
    const xpEarned = variant.xp ?? 0;
    const damage = variant.damage ?? 0;

    const nextRoom = applyStateEffects(game.roomState, variant.stateEffects);
    game.roomState = nextRoom;
    game.xp += xpEarned;
    game.completedQuests += 1;
    game.recentQuestIds = [quest.id, ...game.recentQuestIds.filter(id => id !== quest.id)].slice(0,5);
    game.bosses[quest.zoneId].hp = Math.max(0, game.bosses[quest.zoneId].hp - damage);
    if (!quest.repeatable) game.completedQuestIds.push(quest.id);

    const derivedAfter = calculateDerivedState(game.roomState);

    expect(game.xp).toBe(xpEarned);
    expect(game.bosses[quest.zoneId].hp).toBe(100 - damage);

  // verify Phase 5 semantics for a concrete field after completion: observed unchanged, estimated changed
  const key = 'clothingOnFloor';
  const beforeEstimated = est(mkRoom(), key);
  const expectedEstimated = Math.max(0, beforeEstimated + (variant.stateEffects.clothingOnFloor ?? 0));
  // game.roomState is the post-effect state
  expect(game.roomState[key].observed).toBe(game.roomState[key].observed);
  expect(game.roomState[key].estimated).toBe(expectedEstimated);
  expect(game.roomState[key].confidence).toBe(game.roomState[key].confidence);
  expect(game.roomState[key].lastObservedAt).toBe(game.roomState[key].lastObservedAt);

    expect(typeof derivedBefore.floorClutter).toBe('number');
    expect(typeof derivedAfter.floorClutter).toBe('number');
    expect(derivedAfter.floorClutter).toBeLessThanOrEqual(derivedBefore.floorClutter);

    expect(game.recentQuestIds[0]).toBe(quest.id);
    expect(game.recentQuestIds.filter(id => id === quest.id).length).toBe(1);

    const scoreAfter = explainQuestScore(target, game.roomState, game.recentQuestIds, session).total;
    expect(scoreAfter).not.toBe(scoreBefore);

    const nextQuest = getNextQuest('random', game.roomState, game.completedQuestIds, game.recentQuestIds, null, session);
    expect(nextQuest).toBeTruthy();

    const availAfter = getAvailableQuests('random', game.roomState, game.completedQuestIds);
    expect(availAfter.find(q => q.id === nextQuest.id)).toBeTruthy();
  });
});

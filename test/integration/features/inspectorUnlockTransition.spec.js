import { describe, it, expect } from 'vitest';
import { quests } from '../../../src/data/quests.js';
import { explainAllQuests, getNextQuest, getAvailableQuests, checkRequirement } from '../../../src/game/questEngine.js';
import { calculateDerivedState } from '../../../src/game/derivedState.js';
import { applyStateEffects } from '../../../src/game/roomState.js';
import { mkRoom, est } from '../../test-utils.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('inspector unlock transition', () => {
  it('LOCKED -> AVAILABLE and UI sees change without reload', () => {
    const lockedQuest = quests.find(q => q.id === 'table-wipe');
    expect(lockedQuest).toBeTruthy();

  // start from a normal shaped room and set source fields explicitly as a field object
  // start from a normal shaped room; make surfaceClutter sufficiently high so the quest is locked
  const room = mkRoom({
    surfaceClutter: { observed: 30, estimated: 30, confidence: 1, lastObservedAt: null },
    surfaceCleanliness: { observed: 50, estimated: 50, confidence: 1, lastObservedAt: null },
  });


  const explBefore = explainAllQuests(room, []);
  const entryBefore = explBefore.find(e => e.id === lockedQuest.id);
  expect(entryBefore).toBeTruthy();

  // Compute fullBefore and check each requirement explicitly so we get detailed diagnostics
  const derivedBefore = calculateDerivedState(room);
  const fullBefore = { ...room, ...derivedBefore };
  const reqResultsBefore = (lockedQuest.requirements ?? []).map(r => ({ r, ok: checkRequirement(r, fullBefore), value: fullBefore[r.key] }));
  // At least one requirement should fail (quest locked)
  expect(reqResultsBefore.some(x => x.ok === false)).toBe(true);

  const delta = 20 - est(room, 'surfaceClutter');
  const roomAfter = applyStateEffects(room, { surfaceClutter: { operation: 'add', value: delta } });

    const explAfter = explainAllQuests(roomAfter, []);
    const entryAfter = explAfter.find(e => e.id === lockedQuest.id);
  // DEBUG: inspect after state
  const derivedAfter = calculateDerivedState(roomAfter);
  const fullAfter = { ...roomAfter, ...derivedAfter };
  expect(entryAfter).toBeTruthy();
  expect(entryAfter.eligible).toBe(true);

    const availAfter = getAvailableQuests('random', roomAfter, []);
    expect(availAfter.find(q => q.id === lockedQuest.id)).toBeTruthy();

    const next = getNextQuest('random', roomAfter, [], [], null, { energy: 'normal', preferredQuestMinutes: 10 });
    expect(next).toBeTruthy();
    expect(availAfter.some(q => q.id === next.id)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { getAvailableQuests } from '../src/game/questEngine.js';
import { quests } from '../src/data/quests.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

describe('inspector eligibility', () => {
  it('corrections affect quest eligibility end-to-end', () => {
    const room = clone(defaultRoomState);
    const target = quests.find(q => q.id === 'bathroom-tub-clean');
    expect(target).toBeTruthy();

    const beforeAvail = getAvailableQuests('bathroom', room, []);
    expect(beforeAvail.some(q => q.id === target.id)).toBe(false);

    const afterSet = applyStateEffects(room, { tubClutter: { operation: 'set', value: 20 } });
    const afterAvail = getAvailableQuests('bathroom', afterSet, []);
    expect(afterAvail.some(q => q.id === target.id)).toBe(true);

    const afterReset = applyStateEffects(afterSet, { tubClutter: { operation: 'set', value: 25 } });
    const finalAvail = getAvailableQuests('bathroom', afterReset, []);
    expect(finalAvail.some(q => q.id === target.id)).toBe(false);
  });
});

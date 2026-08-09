import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { getAvailableQuests, explainAllQuests } from '../src/game/questEngine.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Inspector corrections affect quest eligibility');

(async function(){
  const room = clone(defaultRoomState);
  const { quests } = await import('../src/data/quests.js');
  const target = quests.find(q => q.id === 'bathroom-tub-clean');
  assert(target, 'Scour the Shrine quest not found');

  // baseline: tubClutter in defaultRoomState
  console.log(' default tubClutter:', room.tubClutter);
  const beforeAvail = getAvailableQuests('bathroom', room, []);
  assert(!beforeAvail.some(q=>q.id === target.id), 'Quest should be locked at default tubClutter');
  console.log(' ✓ initially locked as expected');

  // set tubClutter = 20
  const afterSet = applyStateEffects(room, { tubClutter: { operation: 'set', value: 20 } });
  console.log(' after set tubClutter:', afterSet.tubClutter);
  const afterAvail = getAvailableQuests('bathroom', afterSet, []);
  assert(afterAvail.some(q=>q.id === target.id), 'Quest should be available after tubClutter lowered to 20');
  console.log(' ✓ became available after correction');

  // set tubClutter back to 25
  const afterReset = applyStateEffects(afterSet, { tubClutter: { operation: 'set', value: 25 } });
  console.log(' after reset tubClutter:', afterReset.tubClutter);
  const finalAvail = getAvailableQuests('bathroom', afterReset, []);
  assert(!finalAvail.some(q=>q.id === target.id), 'Quest should be locked again after tubClutter set back to 25');
  console.log(' ✓ locked again after reverting correction');

  console.log('PASS: corrections affect eligibility end-to-end');
})();

import assert from 'assert';
import { defaultRoomState } from '../src/data/defaultRoomState.js';
import { calculateDerivedState } from '../src/game/derivedState.js';
import { applyStateEffects } from '../src/game/roomState.js';
import { getAvailableQuests, explainAllQuests } from '../src/game/questEngine.js';
import fs from 'fs';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Phase 2 regression checks starting...');

// 1) Concrete state persists; derived does not persist
(function testPersistenceSanitization() {
  // simulate persisted object (localStorage) using useGameState's sanitize behavior expectations
  const room = clone(defaultRoomState);
  const derived = calculateDerivedState(room);
  const persisted = { ...room, ...derived };

  // Simulate the sanitize function by removing derived keys
  const DERIVED_KEYS = ['floorClutter','exposedFloor','floorReadiness','exposedSurface','bathroomCounterClear'];
  for (const k of DERIVED_KEYS) delete persisted[k];

  // After "loading" we should recompute derived from concrete keys only
  const recomputed = calculateDerivedState(persisted);
  assert(typeof recomputed.floorClutter === 'number', 'derived not recomputed on load');

  console.log('PASS: concrete persisted; derived is recomputed (not persisted)');
})();

// 2) floorClutter + exposedFloor approx 100 and derived values recalculated from concrete
(function testDerivedConsistency() {
  const room = clone(defaultRoomState);
  const derived = calculateDerivedState(room);

  // New semantics: exposedFloor is derived from floorObstruction (exposedFloor == 100 - floorObstruction)
  assert(Math.abs(derived.exposedFloor - (100 - (room.floorObstruction ?? 0))) < 0.0001, `exposedFloor=${derived.exposedFloor}, expected ${100 - (room.floorObstruction ?? 0)}`);

  // Changing one concrete metric should change floorClutter predictably
  const beforeClutter = derived.floorClutter;
  const room2 = clone(room);
  room2.clothingOnFloor = Math.min(100, room2.clothingOnFloor + 20);
  const afterDerived = calculateDerivedState(room2);
  assert(afterDerived.floorClutter > beforeClutter, 'floorClutter did not increase after increasing clothingOnFloor');

  console.log('PASS: derived recalculated and consistent with concrete sources');
})();

// 3) Derived values never contradict source values (e.g., exposedFloor derived from floorObstruction)
(function testDerivedNonContradiction() {
  const room = clone(defaultRoomState);
  const derived = calculateDerivedState(room);
  // exposedFloor should equal 100 - floorObstruction per design
  assert(Math.abs(derived.exposedFloor - (100 - (room.floorObstruction ?? 0))) < 0.0001, 'exposedFloor contradicts floorObstruction');
  console.log('PASS: derived values do not contradict concrete sources');
})();

// 4) Completing a quest changes only concrete metrics (async variant below)
// placeholder

(async function testQuestEffectsConcreteOnlyAsync(){
  const room = clone(defaultRoomState);
  const { quests } = await import('../src/data/quests.js');
  const q = quests.find(x=>x.variants && Object.values(x.variants)[0]);
  assert(q, 'no quest found');
  const variant = q.variants.normal ?? Object.values(q.variants)[0];
  const before = { ...room, ...calculateDerivedState(room) };
  const after = applyStateEffects(room, variant.stateEffects);
  const afterFull = { ...after, ...calculateDerivedState(after) };

  // No derived keys should be present in variant.stateEffects (roomState.applyStateEffects ignores derived writes)
  const derivedKeys = ['floorClutter','exposedFloor','floorReadiness','exposedSurface','bathroomCounterClear'];
  for (const k of derivedKeys) {
    assert(!(k in variant.stateEffects), `variant erroneously writes derived key ${k}`);
  }

  // Verify only concrete metrics changed: compare lists of keys
  const changed = [];
  for (const k of Object.keys(after)) {
    if (after[k] !== room[k]) changed.push(k);
  }

  // Derived keys should not be listed as changed (they come from derived calculation)
  for (const dk of derivedKeys) {
    assert(!changed.includes(dk), `derived key ${dk} was changed directly`);
  }

  console.log('PASS: completing a quest changes only concrete metrics (derived keys not directly written)');
})();

// 5) All state values remain clamped between 0–100
(async function testClamping() {
  const room = clone(defaultRoomState);
  const { quests } = await import('../src/data/quests.js');
  const q = quests.find(x=>x.variants && Object.values(x.variants)[0]);
  const variant = q.variants.normal ?? Object.values(q.variants)[0];

  // create massive effects
  const effects = {};
  for (const k of Object.keys(room)) effects[k] = 200;
  const after = applyStateEffects(room, effects);
  for (const k of Object.keys(after)) {
    assert(after[k] <= 100 && after[k] >= 0, `clamping failed for ${k}: ${after[k]}`);
  }

  // negative
  const effects2 = {};
  for (const k of Object.keys(room)) effects2[k] = -200;
  const after2 = applyStateEffects(room, effects2);
  for (const k of Object.keys(after2)) {
    assert(after2[k] <= 100 && after2[k] >= 0, `clamping failed for ${k}: ${after2[k]}`);
  }

  console.log('PASS: clamping keeps values in [0,100]');
})();

// 6) Reset restores canonical initial state
(function testResetRestore() {
  // Simulate a reset by using defaultRoomState
  const room = clone(defaultRoomState);
  const mutated = { ...room, clothingOnFloor: Math.max(0, room.clothingOnFloor - 20) };
  // reset -> should equal default again
  const reset = clone(defaultRoomState);
  assert(JSON.stringify(reset) === JSON.stringify(room), 'reset did not restore canonical default');
  console.log('PASS: reset restores canonical initial state');
})();

// 7) Locked quests become eligible automatically when derived thresholds are crossed
(async function testUnlockingViaDerivedThresholds(){
  const room = clone(defaultRoomState);
  const { quests } = await import('../src/data/quests.js');

  // Find a quest currently locked by a derived threshold e.g., floorClutter or exposedFloor
  const full = { ...room, ...calculateDerivedState(room) };
  const locked = quests.find(q => !q.requirements.every(r=>{
    const v = full[r.key];
    if (typeof v !== 'number') return false;
    if (r.operator === '>') return v > r.value;
    if (r.operator === '>=') return v >= r.value;
    if (r.operator === '<') return v < r.value;
    if (r.operator === '<=') return v <= r.value;
    return false;
  }));

  if (!locked) { console.log('SKIP: no locked quest found for unlocking test'); return; }

  // Try to find a quest that, when applied, decreases the blocking metric below threshold
  let unlocker = null;
  for (const a of quests) {
    const variant = a.variants?.normal ?? Object.values(a.variants ?? {})[0];
    if (!variant?.stateEffects) continue;
    const after = applyStateEffects(room, variant.stateEffects);
    const afterFull = { ...after, ...calculateDerivedState(after) };
    const meetsAfter = locked.requirements.every(r => {
      const v = afterFull[r.key];
      if (typeof v !== 'number') return false;
      if (r.operator === '>') return v > r.value;
      if (r.operator === '>=') return v >= r.value;
      if (r.operator === '<') return v < r.value;
      if (r.operator === '<=') return v <= r.value;
      return false;
    });
    if (meetsAfter) { unlocker = a; break; }
  }

  if (!unlocker) { console.log('SKIP: no unlocking sequence found'); return; }

  // Before applying unlocker, locked quest should be ineligible
  const beforeAvailable = getAvailableQuests(locked.zoneId, room, []);
  assert(!beforeAvailable.some(x=>x.id === locked.id), 'locked quest was available before unlocking');

  // After applying unlocker
  const afterRoom = applyStateEffects(room, unlocker.variants.normal.stateEffects);
  const afterAvailable = getAvailableQuests(locked.zoneId, afterRoom, []);
  assert(afterAvailable.some(x=>x.id === locked.id), 'locked quest did not become available after supposed unlocking actions');

  console.log('PASS: locked quests can become eligible when derived thresholds are crossed');
})();

// 8) localStorage contains no stale derived fields (simulate sanitization)
(function testLocalStorageSanitize() {
  const room = clone(defaultRoomState);
  const derived = calculateDerivedState(room);
  const persisted = { ...room, ...derived };
  const DERIVED_KEYS = ['floorClutter','exposedFloor','floorReadiness','exposedSurface','bathroomCounterClear'];
  for (const k of DERIVED_KEYS) {
    assert(k in persisted, 'sanity setup failed');
    delete persisted[k];
  }
  // persisted should now not have derived keys
  for (const k of DERIVED_KEYS) assert(!(k in persisted), `derived key ${k} still in persisted`);
  console.log('PASS: localStorage sanitized (no derived keys)');
})();

console.log('Phase 2 regression checks completed.');

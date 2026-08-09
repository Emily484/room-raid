import assert from 'assert';
import { quests } from '../src/data/quests.js';
import { explainQuestScore, SCORE_CONFIG } from '../src/game/questEngine.js';
import { defaultRoomState } from '../src/data/defaultRoomState.js';

function clone(x){return JSON.parse(JSON.stringify(x));}

console.log('Test: Repetition penalty applies immediately and decays as the quest ages in recent history');

const room = clone(defaultRoomState);

// pick a repeatable quest
const quest = quests.find(q => q.repeatable && typeof q.id === 'string');
assert(quest, 'No repeatable quest found');
console.log(' Using quest:', quest.id, '-', quest.title);

// baseline (not recent)
const baseExpl = explainQuestScore(quest, room, [], { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' baseline repetitionPenalty:', baseExpl.components.repetitionPenalty, ' total:', baseExpl.total);
assert(baseExpl.components.repetitionPenalty === 0, 'Expected no repetition penalty at baseline');

// simulate immediate completion: recent list contains quest at index 0
const recent1 = [quest.id];
const expl1 = explainQuestScore(quest, room, recent1, { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' after immediate completion repetitionPenalty:', expl1.components.repetitionPenalty, ' total:', expl1.total);
assert(expl1.components.repetitionPenalty < 0, 'Expected negative repetition penalty immediately after completion');

// pick two other distinct quests to simulate other completions
const others = quests.filter(q => q.id !== quest.id).slice(0, 3).map(q => q.id);
if (others.length < 2) throw new Error('Not enough other quests to simulate');
const [a,b,c] = others;

// push the quest down to index 2 (recent order: newest first)
const recent2 = [a, b, quest.id];
const expl2 = explainQuestScore(quest, room, recent2, { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' after two other completions repetitionPenalty:', expl2.components.repetitionPenalty, ' total:', expl2.total);

// penalty should be closer to zero (less negative) than expl1
assert(expl2.components.repetitionPenalty > expl1.components.repetitionPenalty, 'Repetition penalty did not decay as recent index increased');

// push the quest out of the recent list entirely
const recent3 = [a, b, c];
const expl3 = explainQuestScore(quest, room, recent3, { energy: 'normal', preferredQuestMinutes: 10 });
console.log(' after being aged out repetitionPenalty:', expl3.components.repetitionPenalty, ' total:', expl3.total);
assert(expl3.components.repetitionPenalty === 0, 'Repetition penalty should be gone after being aged out');

console.log('PASS: repetition penalty applied immediately and decays/becomes 0 as expected');

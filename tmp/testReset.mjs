import { defaultRoomState } from '../src/data/defaultRoomState.js';

function createInitialState() {
  return {
    xp: 0,
    completedQuests: 0,
    completedQuestIds: [],
    recentQuestIds: [],
    roomState: { ...defaultRoomState },
    bosses: {},
  };
}

// Simulate a saved game with modified roomState and some derived keys accidentally present
const saved = {
  xp: 120,
  completedQuests: 3,
  roomState: {
    ...defaultRoomState,
    cardboard: 10,
    clothingOnFloor: 20,
    // someone mistakenly saved derived keys
    floorClutter: 5,
    exposedFloor: 95,
  },
  bosses: { 'great-floor': { hp: 10, maxHp: 100 } },
};

// Hook logic merges saved with defaults similar to useGameState
const parsed = saved;

const loaded = {
  ...createInitialState(),
  ...parsed,

  roomState: {
    ...defaultRoomState,
    ...(parsed.roomState ?? {}),
  },
};

console.log('Loaded roomState (before reset):', loaded.roomState);

// Now simulate resetGame which runs createInitialState()
const reset = createInitialState();
console.log('\nAfter resetGame:', reset.roomState);

// Confirm there are no derived keys in roomState and it equals defaultRoomState
console.log('\nMatches defaultRoomState exactly?', JSON.stringify(reset.roomState) === JSON.stringify(defaultRoomState));

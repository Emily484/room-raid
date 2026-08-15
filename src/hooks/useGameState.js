import {
  useEffect,
  useState,
} from "react";

import { zones } from "../data/zones";

import {
  defaultRoomState,
} from "../data/defaultRoomState";
import { normalizeRoomState } from '../game/roomFields.js';

import {
  applyStateEffects,
} from "../game/roomState";
import { observeField as observeFieldHelper } from '../game/roomFields.js';

const STORAGE_KEY =
  "roomRaidGame";

function makeInitialBosses() {
  return Object.fromEntries(
    zones.map((zone) => [
      zone.id,
      {
        hp: zone.maxHp,
        maxHp: zone.maxHp,
      },
    ])
  );
}

function createInitialState() {
  return {
    xp: 0,

    completedQuests: 0,

    completedQuestIds: [],

    recentQuestIds: [],

  // Persisted active quest id to make the chosen quest survive reloads
  currentQuestId: null,

    roomState: {
      ...defaultRoomState,
    },

    bosses:
      makeInitialBosses(),
  };
}

const DERIVED_KEYS = [
  "floorClutter",
  "exposedFloor",
  "floorReadiness",
  "exposedSurface",
  "bathroomCounterClear",
];

function sanitizeRoomState(roomState) {
  if (!roomState) return roomState;

  const copy = { ...roomState };

  for (const k of DERIVED_KEYS) {
    if (k in copy) {
      delete copy[k];
    }
  }

  return copy;
}

export function useGameState() {
  const [game, setGame] =
    useState(() => {
      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!saved) {
        return createInitialState();
      }

      try {
        const parsed =
          JSON.parse(saved);

        return {
          ...createInitialState(),
          ...parsed,

            roomState: {
              ...defaultRoomState,
              // Normalize persisted room state on hydration to ensure
              // estimates/observations conform to canonical bounds.
              ...(sanitizeRoomState(parsed.roomState) ? normalizeRoomState(sanitizeRoomState(parsed.roomState)) : {}),
            },

          bosses: {
            ...makeInitialBosses(),
            ...(parsed.bosses ??
              {}),
          },

          completedQuestIds:
            parsed.completedQuestIds ??
            [],

          recentQuestIds:
            parsed.recentQuestIds ??
            [],

          currentQuestId:
            parsed.currentQuestId ?? null,
        };
      } catch (error) {
        console.error(
          "Could not load saved Room Raid data:",
          error
        );

        return createInitialState();
      }
    });

  useEffect(() => {
    // Persist a sanitized copy so derived keys are never saved
    const toSave = {
      ...game,
      roomState: sanitizeRoomState(game.roomState),
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(toSave)
    );
  }, [game]);

  function setCurrentQuestId(id) {
    setGame((current) => ({ ...current, currentQuestId: id }));
  }

  function completeQuest(
    quest,
    variantKey = "normal"
  ) {
    if (!quest) {
      console.error(
        "completeQuest called without a quest"
      );

      return {
        xpEarned: 0,
        damage: 0,
      };
    }

    const variant =
      quest.variants?.[
        variantKey
      ];

    if (!variant) {
      console.error(
        `Quest "${quest.id}" does not have variant "${variantKey}".`
      );

      return {
        xpEarned: 0,
        damage: 0,
      };
    }

    const xpEarned =
      variant.xp ?? 0;

    const damage =
      variant.damage ?? 0;

    setGame((current) => {
      const boss =
        current.bosses?.[
          quest.zoneId
        ];

      if (!boss) {
        console.error(
          `No boss found for zone "${quest.zoneId}".`
        );

        return current;
      }

      const completedQuestIds =
        current.completedQuestIds ??
        [];

      const alreadyRecorded =
        completedQuestIds.includes(
          quest.id
        );

      const shouldRecordCompletion =
        !quest.repeatable &&
        !alreadyRecorded;

      // --------------------------------
      // THE IMPORTANT NEW PART
      // --------------------------------

      const nextRoomState =
        applyStateEffects(
          current.roomState,
          variant.stateEffects
        );

      // Keep the five most recent quest
      // types so the engine can avoid
      // annoying repetition.

      const nextRecentQuestIds = [
        quest.id,
        ...(current.recentQuestIds ??
          []).filter(
          (id) =>
            id !== quest.id
        ),
      ].slice(0, 5);

      return {
        ...current,

        xp:
          (current.xp ?? 0) +
          xpEarned,

        completedQuests:
          (current.completedQuests ??
            0) + 1,

        roomState:
          nextRoomState,

        recentQuestIds:
          nextRecentQuestIds,

        completedQuestIds:
          shouldRecordCompletion
            ? [
                ...completedQuestIds,
                quest.id,
              ]
            : completedQuestIds,

        bosses: {
          ...current.bosses,

          [quest.zoneId]: {
            ...boss,

            hp: Math.max(
              0,
              boss.hp -
                damage
            ),
          },
        },
      };
    });

    return {
      xpEarned,
      damage,
    };
  }

  function resetGame() {
    setGame(
      createInitialState()
    );
  }

  function applyEffectsToRoom(effects) {
    setGame((current) => {
      const nextRoomState =
        applyStateEffects(
          current.roomState,
          effects
        );

      return {
        ...current,
        roomState: nextRoomState,
      };
    });
  }

  function observeFieldInRoom(key, value, observedAt) {
    setGame((current) => {
      const nextRoomState = observeFieldHelper(current.roomState, key, value, observedAt);
      return {
        ...current,
        roomState: nextRoomState,
      };
    });
  }

  // Canonical approval pathway: explicit observation-backed updates coming
  // from reconciliation approval. This ensures we preserve shape and trigger
  // derived-state and quest recalculation through the normal game flow.
  function approveObservedField({ field, value, confidence, observedAt }) {
    setGame((current) => {
      // Use the existing observeField helper to set observed/estimated and timestamp
      const nextRoomState = observeFieldHelper(current.roomState, field, value, observedAt || new Date().toISOString());
      // Copy confidence into the field if provided
      if (typeof confidence === 'number') {
        nextRoomState[field] = { ...nextRoomState[field], confidence };
      }

      return {
        ...current,
        roomState: nextRoomState,
      };
    });
  }

  return {
    game,
    completeQuest,
    resetGame,
    applyEffectsToRoom,
    observeFieldInRoom,
    approveObservedField,
    setCurrentQuestId,
  };
}
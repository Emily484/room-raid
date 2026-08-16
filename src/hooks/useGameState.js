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
import { getNextQuest, getAvailableQuests } from '../game/questEngine.js';
import { quests } from '../data/quests.js';

// Minimal UUID v4 generator (non-cryptographic) to avoid adding a dependency.
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  // Temporarily rejected quest ids (most-recent first). Short-lived and persisted.
  recentRejectedQuestIds: [],

  // Reason for last quest change; used by UI to present specific messages.
  // Possible values: null | 'different' | 'no-alternative'
  lastQuestChangeReason: null,

  // Persisted active quest id to make the chosen quest survive reloads
  currentQuestId: null,
  // Identity for the current quest activation — used for idempotent completion
  currentQuestActivationId: null,

  // Minimal record of completed activations to prevent re-application
  completedActivationIds: [],

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

          recentRejectedQuestIds:
            parsed.recentRejectedQuestIds ?? [],

          lastQuestChangeReason:
            parsed.lastQuestChangeReason ?? null,

          currentQuestId:
            parsed.currentQuestId ?? null,
          // Preserve activation id if present; otherwise, migrate by creating
          // a new activation id when a currentQuestId exists in older saves.
          currentQuestActivationId:
            parsed.currentQuestActivationId ?? (parsed.currentQuestId ? `qa-${uuidv4()}` : null),

          completedActivationIds:
            parsed.completedActivationIds ?? [],
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
    // Generate a new activation id each time the app explicitly sets
    // the current quest. This ensures repeated activations of the same
    // quest definition are distinct.
    const nextActivationId = id ? `qa-${uuidv4()}` : null;

    setGame((current) => ({
      ...current,
      currentQuestId: id,
      currentQuestActivationId: nextActivationId,
    }));
  }

  // Reject the current quest and pick a different one, persisted and atomic.
  function rejectCurrentQuestAndPickDifferent(zoneId = null, session = { energy: 'normal', preferredQuestMinutes: 10 }, maxRejected = 3) {
    setGame((current) => {
      const curId = current.currentQuestId;

      // If nothing is active, just pick one normally
      if (!curId) {
        const pick = getNextQuest(zoneId, current.roomState, current.completedQuestIds, current.recentQuestIds, null, session, current.recentRejectedQuestIds);
  const nextQuestId = pick ? pick.id : null;
  const nextActivationId = nextQuestId ? `qa-${uuidv4()}` : null;
        return {
          ...current,
          currentQuestId: nextQuestId,
          currentQuestActivationId: nextActivationId,
        };
      }

      // Build next rejection list: add curId to front, dedupe, and trim to maxRejected
      const existing = (current.recentRejectedQuestIds || []).filter((id) => id !== curId);
      const nextRejected = [curId, ...existing].slice(0, maxRejected);

      // Strict rejection semantics for the explicit "Different Quest" flow:
      // compute available quests, apply rejection filter, and if no
      // unrejected candidate remains, return null (no fallback to the
      // unfiltered pool). This ensures explicit user rejection is honored.
      const available = getAvailableQuests(zoneId, current.roomState, current.completedQuestIds);
      const rejectedSet = new Set(nextRejected);
      const filtered = available.filter((q) => !rejectedSet.has(q.id));

      if (filtered.length === 0) {
        // No replacement available after honoring rejections.
        // Persist rejection and set an authoritative reason so UI can show a specific message.
        return {
          ...current,
          recentRejectedQuestIds: nextRejected,
          currentQuestId: null,
          currentQuestActivationId: null,
          lastQuestChangeReason: 'no-alternative',
        };
      }

      // Otherwise pick from the unrejected candidates using the normal
      // scoring/selection flow.
      const pick = getNextQuest(zoneId, current.roomState, current.completedQuestIds, current.recentQuestIds, null, session, nextRejected);
      const nextQuestId = pick ? pick.id : null;
      const nextActivationId = nextQuestId ? `qa-${uuidv4()}` : null;
      return {
        ...current,
        recentRejectedQuestIds: nextRejected,
        currentQuestId: nextQuestId,
        currentQuestActivationId: nextActivationId,
        lastQuestChangeReason: 'different',
      };
    });
    // function intentionally returns void; callers should react to authoritative game state.
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

  // Atomically complete the current activation (by id) and pick the next quest
  // This performs the entire transition inside a single setGame functional updater
  // so selection uses the authoritative post-completion state.
  function completeQuestAndPickNext(
    questId,
    variantKey = 'normal',
    activationId,
    zoneId = null,
    session = { energy: 'normal', preferredQuestMinutes: 10 }
  ) {
    setGame((current) => {
      // Validate current active quest/activation
      if (questId !== current.currentQuestId) {
        console.error('completeQuestAndPickNext: submitted questId does not match current active quest');
        return current;
      }

      if (activationId !== current.currentQuestActivationId) {
        console.error('completeQuestAndPickNext: submitted activationId does not match current activation');
        return current;
      }

      // Idempotency: if this activation has already been completed, no-op
      const completed = current.completedActivationIds || [];
      if (completed.includes(activationId)) {
        // Already applied
        return current;
      }

      const quest = quests.find((q) => q.id === questId) || null;

      if (!quest) {
        console.error(`completeQuestAndPickNext: unknown quest "${questId}"`);
        return current;
      }

      const variant = quest.variants?.[variantKey];
      if (!variant) {
        console.error(`completeQuestAndPickNext: quest "${questId}" missing variant "${variantKey}"`);
        return current;
      }

      const xpEarned = variant.xp ?? 0;
      const damage = variant.damage ?? 0;

      // Apply state effects
      const nextRoomState = applyStateEffects(current.roomState, variant.stateEffects);

      // Update recent quest ids
      const nextRecentQuestIds = [
        questId,
        ...(current.recentQuestIds ?? []).filter((id) => id !== questId),
      ].slice(0, 5);

      const completedQuestIds = current.completedQuestIds ?? [];
      const shouldRecordCompletion = !quest.repeatable && !completedQuestIds.includes(questId);

      const nextCompletedQuestIds = shouldRecordCompletion ? [...completedQuestIds, questId] : completedQuestIds;

      const nextBosses = {
        ...current.bosses,
        [quest.zoneId]: {
          ...current.bosses?.[quest.zoneId],
          hp: Math.max(0, (current.bosses?.[quest.zoneId]?.hp ?? 0) - damage),
        },
      };

      const nextCompletedActivationIds = [...(current.completedActivationIds ?? []), activationId];

      // Pick next quest using post-completion state
      // To avoid annoying immediate repetition, ask the selector to
      // exclude the just-completed quest when alternatives exist.
      // Also pass through any recently rejected ids so rejection still takes precedence.
      const pick = getNextQuest(
        zoneId,
        nextRoomState,
        nextCompletedQuestIds,
        nextRecentQuestIds,
        questId, // exclude this id when alternatives exist
        session,
        current.recentRejectedQuestIds // ensure rejected ids are honored
      );

      const nextQuestId = pick ? pick.id : null;
      const nextActivationId = nextQuestId ? `qa-${uuidv4()}` : null;

      return {
        ...current,
        xp: (current.xp ?? 0) + xpEarned,
        completedQuests: (current.completedQuests ?? 0) + 1,
        roomState: nextRoomState,
        recentQuestIds: nextRecentQuestIds,
        completedQuestIds: nextCompletedQuestIds,
        bosses: nextBosses,
        completedActivationIds: nextCompletedActivationIds,
        currentQuestId: nextQuestId,
        currentQuestActivationId: nextActivationId,
      };
    });
  }

  function resetGame() {
    setGame(
      createInitialState()
    );
  }

  function clearLastQuestChangeReason() {
    setGame((current) => ({
      ...current,
      lastQuestChangeReason: null,
    }));
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
    completeQuestAndPickNext,
    rejectCurrentQuestAndPickDifferent,
    clearLastQuestChangeReason,
    resetGame,
    applyEffectsToRoom,
    observeFieldInRoom,
    approveObservedField,
    setCurrentQuestId,
  };
}
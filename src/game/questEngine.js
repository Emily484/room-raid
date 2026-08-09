// src/game/questEngine.js

import { quests } from "../data/quests";

function checkRequirement(
  requirement,
  roomState
) {
  const currentValue =
    roomState?.[requirement.key];

  if (currentValue === undefined) {
    console.warn(
      `Room state does not contain "${requirement.key}".`
    );

    return false;
  }

  switch (requirement.operator) {
    case ">":
      return (
        currentValue >
        requirement.value
      );

    case ">=":
      return (
        currentValue >=
        requirement.value
      );

    case "<":
      return (
        currentValue <
        requirement.value
      );

    case "<=":
      return (
        currentValue <=
        requirement.value
      );

    case "===":
      return (
        currentValue ===
        requirement.value
      );

    default:
      console.warn(
        `Unknown requirement operator "${requirement.operator}".`
      );

      return false;
  }
}

export function questMeetsRequirements(
  quest,
  roomState
) {
  if (
    !quest.requirements ||
    quest.requirements.length === 0
  ) {
    return true;
  }

  return quest.requirements.every(
    (requirement) =>
      checkRequirement(
        requirement,
        roomState
      )
  );
}

export function getAvailableQuests(
  zoneId,
  roomState,
  completedQuestIds = []
) {
  return quests.filter((quest) => {
    // -------------------------
    // Correct zone?
    // -------------------------

    const correctZone =
      !zoneId ||
      zoneId === "random" ||
      quest.zoneId === zoneId;

    if (!correctZone) {
      return false;
    }

    // -------------------------
    // Room conditions satisfied?
    // -------------------------

    if (
      !questMeetsRequirements(
        quest,
        roomState
      )
    ) {
      return false;
    }

    // -------------------------
    // Already permanently done?
    // -------------------------

    const alreadyCompleted =
      completedQuestIds.includes(
        quest.id
      );

    if (
      alreadyCompleted &&
      !quest.repeatable
    ) {
      return false;
    }

    return true;
  });
}

export function scoreQuest(
  quest,
  roomState,
  recentQuestIds = []
) {
  let score =
    quest.priority ?? 50;

  // ---------------------------------
  // How severe is the relevant mess?
  // ---------------------------------

  for (
    const requirement
    of quest.requirements ?? []
  ) {
    const value =
      roomState?.[
        requirement.key
      ];

    if (
      typeof value !== "number"
    ) {
      continue;
    }

    // For quests triggered by HIGH values:
    //
    // clothingOnFloor > 5
    //
    // more clothing = more urgency.

    if (
      requirement.operator === ">" ||
      requirement.operator === ">="
    ) {
      score += value * 0.25;
    }

    // For quests triggered by LOW values:
    //
    // floorCleanliness < 75
    //
    // lower cleanliness = more urgency.

    if (
      requirement.operator === "<" ||
      requirement.operator === "<="
    ) {
      score +=
        (100 - value) * 0.25;
    }
  }

  // ---------------------------------
  // Don't give me the same shit again
  // ---------------------------------

  const recentIndex =
    recentQuestIds.indexOf(
      quest.id
    );

  if (recentIndex !== -1) {
    // Most recent task gets the
    // biggest penalty.

    const penalty =
      Math.max(
        10,
        45 - recentIndex * 8
      );

    score -= penalty;
  }

  return Math.max(
    1,
    Math.round(score)
  );
}

function weightedRandom(
  scoredQuests
) {
  const totalWeight =
    scoredQuests.reduce(
      (total, item) =>
        total + item.score,
      0
    );

  let roll =
    Math.random() *
    totalWeight;

  for (const item of scoredQuests) {
    roll -= item.score;

    if (roll <= 0) {
      return item.quest;
    }
  }

  return scoredQuests[
    scoredQuests.length - 1
  ].quest;
}

export function getNextQuest(
  zoneId,
  roomState,
  completedQuestIds = [],
  recentQuestIds = [],
  excludeId = null
) {
  let available =
    getAvailableQuests(
      zoneId,
      roomState,
      completedQuestIds
    );

  // Don't immediately reroll the
  // exact same task if alternatives exist.

  if (
    excludeId &&
    available.length > 1
  ) {
    available =
      available.filter(
        (quest) =>
          quest.id !== excludeId
      );
  }

  if (
    available.length === 0
  ) {
    return null;
  }

  const scored =
    available
      .map((quest) => ({
        quest,

        score: scoreQuest(
          quest,
          roomState,
          recentQuestIds
        ),
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      );

  // ---------------------------------
  // Only consider the top candidates.
  //
  // This keeps the game intelligent
  // without making it totally
  // deterministic.
  // ---------------------------------

  const candidates =
    scored.slice(0, 3);

  return weightedRandom(
    candidates
  );
}
import { quests } from "../data/quests.js";
import { calculateDerivedState } from "./derivedState.js";
import { applyStateEffects } from "./roomState.js";

export function checkRequirement(requirement, roomState) {
  const value = roomState?.[requirement.key];
  if (typeof value !== 'number') return false;
  if (requirement.operator === '>') return value > requirement.value;
  if (requirement.operator === '>=') return value >= requirement.value;
  if (requirement.operator === '<') return value < requirement.value;
  if (requirement.operator === '<=') return value <= requirement.value;
  if (requirement.operator === '==') return value === requirement.value;
  return false;
}

export function questMeetsRequirements(quest, roomState) {
  if (!quest.requirements || quest.requirements.length === 0) return true;
  return quest.requirements.every(r => checkRequirement(r, roomState));
}

export function getAvailableQuests(zoneId, roomState, completedQuestIds = []) {
  const derived = calculateDerivedState(roomState);
  const full = { ...roomState, ...derived };

  return quests.filter((q) => {
    if (zoneId && zoneId !== 'random' && q.zoneId !== zoneId) return false;

    // if quest is non-repeatable and already completed, skip
    if (!q.repeatable && completedQuestIds.includes(q.id)) return false;

    // must meet requirements
    if (!questMeetsRequirements(q, full)) return false;

    return true;
  });
}

export const SCORE_CONFIG = {
  urgencyWeight: 0.35,
  unlockPriorityMultiplier: 0.25,
  zoneMomentumPerTask: 4,
  maxZoneMomentumCount: 3,
  varietyMultiplier: 3,
  repetitionBasePenalty: 40,
  repetitionDecay: 7,
  repetitionMinPenalty: 8,
  effortLowEnergyMultiplier: 6,
  effortNormalEnergyMultiplier: 2.0,
  effortHighEnergyMultiplier: 0.6,
};

export function scoreQuest(
  quest,
  roomState,
  recentQuestIds = [],
  session = { energy: "normal", preferredQuestMinutes: 10 },
  explain = false
) {
  const derived = calculateDerivedState(roomState);
  const fullState = { ...roomState, ...derived };

  const c = SCORE_CONFIG;

  const components = {
    basePriority: quest.priority ?? 50,
    urgency: 0,
    unlockPotential: 0,
    zoneMomentum: 0,
    varietyBonus: 0,
    repetitionPenalty: 0,
    effortPenalty: 0,
  };

  // URGENCY
  for (const requirement of quest.requirements ?? []) {
    const value = fullState?.[requirement.key];
    if (typeof value !== "number") continue;

    if (requirement.operator === ">" || requirement.operator === ">=") {
      components.urgency += value * c.urgencyWeight;
    }

    if (requirement.operator === "<" || requirement.operator === "<=") {
      components.urgency += (100 - value) * c.urgencyWeight;
    }
  }

  // UNLOCK POTENTIAL (simulate normal variant)
  try {
    const variant = quest.variants?.normal ?? Object.values(quest.variants ?? {})[0];
    if (variant?.stateEffects) {
      const afterRoom = applyStateEffects(roomState, variant.stateEffects);
      const beforeFull = fullState;
      const afterFull = { ...afterRoom, ...calculateDerivedState(afterRoom) };

      for (const other of quests) {
        if (other.id === quest.id) continue;
        const meetsBefore = questMeetsRequirements(other, beforeFull);
        const meetsAfter = questMeetsRequirements(other, afterFull);
        if (!meetsBefore && meetsAfter) {
          components.unlockPotential += (other.priority ?? 50) * c.unlockPriorityMultiplier;
        }
      }
    }
  } catch (err) {
    console.warn("unlock simulation failed", err);
  }

  // ZONE MOMENTUM
  const zoneMomentumCount = (recentQuestIds ?? []).filter((id) => {
    const q = quests.find((x) => x.id === id);
    return q && q.zoneId === quest.zoneId;
  }).length;
  components.zoneMomentum = Math.min(c.maxZoneMomentumCount, zoneMomentumCount) * c.zoneMomentumPerTask;

  // VARIETY
  const categoryCounts = {};
  for (const id of recentQuestIds ?? []) {
    const q = quests.find((x) => x.id === id);
    if (!q) continue;
    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
  }
  const avgCategory = Object.values(categoryCounts).length
    ? Object.values(categoryCounts).reduce((a, b) => a + b, 0) / Object.values(categoryCounts).length
    : 0;
  const myCategoryCount = categoryCounts[quest.category] ?? 0;
  components.varietyBonus = Math.max(0, Math.round((avgCategory - myCategoryCount) * c.varietyMultiplier));

  // REPETITION PENALTY
  const recentIndex = recentQuestIds.indexOf(quest.id);
  if (recentIndex !== -1) {
    components.repetitionPenalty = -Math.max(c.repetitionMinPenalty, c.repetitionBasePenalty - recentIndex * c.repetitionDecay);
  }

  // EFFORT PENALTY / SESSION
  let estimatedMinutes = 0;
  if (quest.variants) {
    const variants = Object.values(quest.variants);
    estimatedMinutes = variants[0]?.estimatedMinutes ?? 0;
    for (const v of variants) {
      if (typeof v.estimatedMinutes === 'number') {
        estimatedMinutes = Math.min(estimatedMinutes || Infinity, v.estimatedMinutes);
      }
    }
  }
  const preferred = session?.preferredQuestMinutes ?? 10;
  const energy = session?.energy ?? 'normal';
  if (estimatedMinutes > preferred) {
    const over = estimatedMinutes - preferred;
    const multiplier = energy === 'low' ? c.effortLowEnergyMultiplier : energy === 'high' ? c.effortHighEnergyMultiplier : c.effortNormalEnergyMultiplier;
    components.effortPenalty = -over * multiplier;
  }

  // Total
  const total = Math.max(1, Math.round(
    components.basePriority + components.urgency + components.unlockPotential + components.zoneMomentum + components.varietyBonus + components.repetitionPenalty + components.effortPenalty
  ));

  if (explain) return { total, components };

  return total;
}

export function explainQuestScore(quest, roomState, recentQuestIds = [], session = { energy: 'normal', preferredQuestMinutes: 10 }) {
  return scoreQuest(quest, roomState, recentQuestIds, session, true);
}

export function explainAllQuests(roomState, recentQuestIds = [], session = { energy: 'normal', preferredQuestMinutes: 10 }) {
  const derived = calculateDerivedState(roomState);
  const fullState = { ...roomState, ...derived };

  return quests.map((q) => {
    const eligible = questMeetsRequirements(q, fullState);
    const explanation = explainQuestScore(q, roomState, recentQuestIds, session);

    const failedRequirements = eligible ? [] : (q.requirements ?? []).filter(r => !checkRequirement(r, fullState));

    return {
      id: q.id,
      title: q.title,
      zone: q.zoneId,
      eligible,
      failedRequirements,
      total: explanation.total,
      components: explanation.components,
    };
  });
}

// Lightweight UI helper that gives a short human-friendly reason
export function getQuestReason(quest) {
  if (!quest) return "";

  if (quest.tags?.includes("boss")) {
    return "Boss vulnerability detected";
  }

  if (quest.stage >= 3) {
    return "Progression task";
  }

  if (quest.priority >= 90) {
    return "High-impact problem";
  }

  if (quest.priority >= 75) {
    return "Strong next move";
  }

  return "Useful progress";
}

export function weightedRandom(
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
  excludeId = null,
  session = { energy: 'normal', preferredQuestMinutes: 10 }
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
          recentQuestIds,
          session
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
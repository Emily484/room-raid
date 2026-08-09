export default function QuestCard({
  quest,
  difficulty,
  onComplete,
  onFuckThis,
  onReroll,
  reason,
}) {
  if (!quest) {
    return null;
  }

  const variantKey =
    difficulty === 0
      ? "normal"
      : difficulty === 1
      ? "small"
      : "tiny";

  const variant =
    quest.variants[variantKey];

  const difficultyLabel =
    difficulty === 0
      ? "FULL QUEST"
      : difficulty === 1
      ? "REDUCED QUEST"
      : "ABSOLUTE MINIMUM";

  return (
    <section className="quest-card active-quest">
      <div className="quest-topline">
        <span className="quest-label">
          CURRENT QUEST
        </span>

        <span className="quest-size">
          {difficultyLabel}
        </span>
      </div>

      <h1>{quest.title}</h1>

      <p className="quest-description">
        {quest.description}
      </p>

      {reason && (
        <div className="quest-reason">
          <span>WHY THIS?</span>
          {reason}
        </div>
      )}

      <div className="quest-objective">
        {variant.task}
      </div>

      <div className="quest-rewards">
        <span>
          +{variant.xp} XP
        </span>

        <span>
          ⚔ {variant.damage} damage
        </span>

        <span>
          ~{variant.estimatedMinutes} min
        </span>
      </div>

      <div className="quest-actions">
        <button
          className="complete"
          onClick={() =>
            onComplete(variantKey)
          }
        >
          ⚔ QUEST COMPLETE
        </button>

        <button
          onClick={onReroll}
        >
          ↻ Different Quest
        </button>

        <button
          className="fuck-this"
          onClick={onFuckThis}
        >
          😡 FUCK THIS
        </button>
      </div>
    </section>
  );
}
export default function QuestCard({
  quest,
  difficulty,
  onComplete,
  onFuckThis,
  onReroll,
  reason,
}) {
  if (!quest) {
    return (
      <section className="quest-card">
        <div className="quest-label">
          QUEST LOG
        </div>

        <h2>
          No active quest.
        </h2>
      </section>
    );
  }

  const variantKey =
    difficulty === 0
      ? "normal"
      : difficulty === 1
      ? "small"
      : "tiny";

  const variant =
    quest.variants?.[
      variantKey
    ];

  if (!variant) {
    return (
      <section className="quest-card">
        <h2>
          Quest data error.
        </h2>

        <p>
          This quest does not have a
          {` ${variantKey} `}
          variant.
        </p>
      </section>
    );
  }

  return (
    <section className="quest-card">
      <div className="quest-label">
        CURRENT QUEST
      </div>

      <h1>
        {quest.title}
      </h1>

      {reason && (
        <p className="quest-reason">
          WHY THIS QUEST? {reason}
        </p>
      )}

      {quest.description && (
        <p className="quest-description">
          {quest.description}
        </p>
      )}

      <p className="quest-task">
        {variant.task}
      </p>

      <div className="quest-meta">
        <span>
          +{variant.xp} XP
        </span>

        <span>
          ⚔️ {variant.damage} damage
        </span>

        <span>
          ~{variant.estimatedMinutes} min
        </span>
      </div>

      <div className="quest-actions">
        <button
          className="complete"
          onClick={() =>
            onComplete(
              variantKey
            )
          }
        >
          ⚔️ QUEST COMPLETE
        </button>

        <button
          onClick={onReroll}
        >
          🎲 Give Me Something Else
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
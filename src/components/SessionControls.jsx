export default function SessionControls({
  session,
  setSession,
}) {
  function updateEnergy(energy) {
    setSession((current) => ({
      ...current,
      energy,
    }));
  }

  function updateMinutes(
    preferredQuestMinutes
  ) {
    setSession((current) => ({
      ...current,
      preferredQuestMinutes,
    }));
  }

  return (
    <section className="session-controls">
      <div className="session-heading">
        <div>
          <p className="eyebrow">
            CURRENT RUN
          </p>

          <h2>
            How much humanity do we
            have?
          </h2>
        </div>
      </div>

      <div className="session-grid">
        <div>
          <div className="session-label">
            Energy
          </div>

          <div className="session-options">
            <button
              className={
                session.energy === "low"
                  ? "active"
                  : ""
              }
              onClick={() =>
                updateEnergy("low")
              }
            >
              💀 Barely alive
            </button>

            <button
              className={
                session.energy ===
                "normal"
                  ? "active"
                  : ""
              }
              onClick={() =>
                updateEnergy("normal")
              }
            >
              😐 Functional
            </button>

            <button
              className={
                session.energy === "high"
                  ? "active"
                  : ""
              }
              onClick={() =>
                updateEnergy("high")
              }
            >
              😈 Release me
            </button>
          </div>
        </div>

        <div>
          <div className="session-label">
            Preferred quest length
          </div>

          <div className="session-options">
            {[2, 5, 10, 15].map(
              (minutes) => (
                <button
                  key={minutes}
                  className={
                    session.preferredQuestMinutes ===
                    minutes
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    updateMinutes(
                      minutes
                    )
                  }
                >
                  {minutes} min
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
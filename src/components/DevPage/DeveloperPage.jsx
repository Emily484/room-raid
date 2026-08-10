import RoomStateDebug from "./RoomStateDebug.jsx";
import RoomInspector from "./RoomInspector.jsx";
import { explainAllQuests } from "../../game/questEngine.js";
import { calculateDerivedState } from "../../game/derivedState.js";
import "./DeveloperPage.css";

function formatScore(value) {
  const rounded = Math.round(value ?? 0);

  if (rounded > 0) {
    return `+${rounded}`;
  }

  return `${rounded}`;
}

function RequirementFail({ req, fullState }) {
  const current = fullState?.[req.key];

  return (
    <div className="requirement-fail">
      <div className="requirement-rule">
        <span className="requirement-x">×</span>

        <span>
          <strong>{req.key}</strong>{" "}
          must be {req.operator} {req.value}
        </span>
      </div>

      <div className="requirement-current">
        Current:{" "}
        {typeof current === "number"
          ? current.toFixed(1)
          : String(current)}
      </div>
    </div>
  );
}

function ScoreComponent({
  label,
  value,
}) {
  return (
    <div className="score-component">
      <span>{label}</span>

      <strong
        className={
          value < 0
            ? "score-negative"
            : value > 0
            ? "score-positive"
            : "score-neutral"
        }
      >
        {formatScore(value)}
      </strong>
    </div>
  );
}

export default function DeveloperPage({
  game,
  applyEffects,
  observeField,
}) {
  const session = {
    energy: "normal",
    preferredQuestMinutes: 10,
  };

  const explanations =
    explainAllQuests(
      game.roomState,
      game.recentQuestIds,
      session
    );

  const fullState = {
    ...game.roomState,
    ...calculateDerivedState(
      game.roomState
    ),
  };

  const availableCount =
    explanations.filter(
      (quest) => quest.eligible
    ).length;

  const lockedCount =
    explanations.length -
    availableCount;

  return (
    <main className="developer-page">
      <header className="developer-header">
        <div>
          <div className="developer-eyebrow">
            DEVELOPER MODE
          </div>

          <h1>Developer Tools</h1>

          <p>
            Inspect quest decisions,
            room state, and progression
            logic.
          </p>
        </div>

        <div className="developer-header-stats">
          <div className="dev-stat">
            <span>Available</span>
            <strong>
              {availableCount}
            </strong>
          </div>

          <div className="dev-stat">
            <span>Locked</span>
            <strong>
              {lockedCount}
            </strong>
          </div>

          <div className="dev-stat">
            <span>Total</span>
            <strong>
              {explanations.length}
            </strong>
          </div>
        </div>
      </header>

      <section className="developer-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              DECISION ENGINE
            </div>

            <h2>Quest Engine</h2>
          </div>

          <div className="session-summary">
            Normal energy · 10 min target
          </div>
        </div>

        <div className="quest-engine">
          {explanations.map(
            (quest, index) => (
              <article
                key={quest.id}
                className={`quest-explain ${
                  quest.eligible
                    ? "quest-available"
                    : "quest-locked"
                }`}
              >
                <div className="quest-card-header">
                  <div className="quest-rank">
                    {index + 1}
                  </div>

                  <div className="quest-heading-copy">
                    <h3>
                      {quest.title}
                    </h3>

                    <div className="quest-id">
                      {quest.id}
                    </div>
                  </div>

                  <div className="quest-score">
                    <span>Score</span>
                    <strong>
                      {Math.round(
                        quest.total
                      )}
                    </strong>
                  </div>
                </div>

                <div className="quest-status-row">
                  {quest.eligible ? (
                    <span className="status-badge status-available">
                      ✓ AVAILABLE
                    </span>
                  ) : (
                    <span className="status-badge status-locked">
                      🔒 LOCKED
                    </span>
                  )}
                </div>

                {!quest.eligible &&
                quest.failedRequirements
                  .length > 0 ? (
                  <div className="locked-details">
                    <div className="failed-list">
                      {quest.failedRequirements.map(
                        (
                          requirement,
                          requirementIndex
                        ) => (
                          <RequirementFail
                            key={
                              requirementIndex
                            }
                            req={
                              requirement
                            }
                            fullState={
                              fullState
                            }
                          />
                        )
                      )}
                    </div>

                    <div className="hypothetical-score">
                      Hypothetical score
                      <strong>
                        {Math.round(
                          quest.total
                        )}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="breakdown">
                    <ScoreComponent
                      label="Base priority"
                      value={
                        quest.components
                          .basePriority
                      }
                    />

                    <ScoreComponent
                      label="Urgency"
                      value={
                        quest.components
                          .urgency
                      }
                    />

                    <ScoreComponent
                      label="Unlock potential"
                      value={
                        quest.components
                          .unlockPotential
                      }
                    />

                    <ScoreComponent
                      label="Zone momentum"
                      value={
                        quest.components
                          .zoneMomentum
                      }
                    />

                    <ScoreComponent
                      label="Variety"
                      value={
                        quest.components
                          .varietyBonus
                      }
                    />

                    <ScoreComponent
                      label="Repetition"
                      value={
                        quest.components
                          .repetitionPenalty
                      }
                    />

                    <ScoreComponent
                      label="Effort"
                      value={
                        quest.components
                          .effortPenalty
                      }
                    />
                  </div>
                )}
              </article>
            )
          )}
        </div>
      </section>

      <section className="developer-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              CALIBRATION
            </div>

            <h2>Room Inspector</h2>
          </div>
        </div>

        <RoomInspector
          game={game}
          applyEffects={applyEffects}
          observeField={observeField}
        />
      </section>

      <section className="developer-section">
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              RAW STATE
            </div>

            <h2>Room Model</h2>
          </div>
        </div>

        <RoomStateDebug
          roomState={
            game.roomState
          }
        />
      </section>
    </main>
  );
}
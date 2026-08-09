import RoomStateDebug from "./RoomStateDebug";
import RoomInspector from "./RoomInspector";
import { explainAllQuests } from "../game/questEngine.js";
import { calculateDerivedState } from "../game/derivedState.js";

function RequirementFail({ req, fullState }) {
  const cur = fullState?.[req.key];
  return (
    <div className="req-fail">
      ✗ {req.key} must be {req.operator} {req.value}
      <div className="req-cur">current: {typeof cur === 'number' ? cur.toFixed(1) : String(cur)}</div>
    </div>
  );
}

export default function DeveloperPage({ game, applyEffects }) {
  const explanations = explainAllQuests(game.roomState, game.recentQuestIds, { energy: 'normal', preferredQuestMinutes: 10 });
  const derived = { ...game.roomState, ...calculateDerivedState(game.roomState) };

  return (
    <main className="developer-page">
      <div className="dev-banner">DEVELOPER MODE — Developer Tools</div>
      <h1 style={{ fontSize: 22, margin: '8px 0 12px 0', color: 'var(--accent)' }}>Quest Engine</h1>

      <div className="quest-engine">
        {explanations.map((q, idx) => (
          <div key={q.id} className="quest-explain">
            <div className="quest-row">
              <div className="quest-order">{idx + 1}.</div>
              <div className="quest-title">{q.title}</div>
              <div className="quest-score">{q.total}</div>
            </div>

            <div className="quest-meta">
              {q.eligible ? <div className="available">✓ AVAILABLE</div> : <div className="locked">🔒 LOCKED</div>}
            </div>

            {!q.eligible && q.failedRequirements.length > 0 ? (
              <div className="failed-list">
                {q.failedRequirements.map((r, i) => (
                  <div key={i} className="failed-item">
                    <RequirementFail req={r} fullState={derived} />
                  </div>
                ))}
                <div className="hypo">hypothetical score: {q.total}</div>
              </div>
            ) : (
              <div className="breakdown">
                <div className="comp">Base priority <span>+{q.components.basePriority}</span></div>
                <div className="comp">Urgency <span>+{Math.round(q.components.urgency)}</span></div>
                <div className="comp">Unlock potential <span>+{Math.round(q.components.unlockPotential)}</span></div>
                <div className="comp">Zone momentum <span>+{Math.round(q.components.zoneMomentum)}</span></div>
                <div className="comp">Variety <span>+{Math.round(q.components.varietyBonus)}</span></div>
                <div className="comp">Repetition <span>{q.components.repetitionPenalty < 0 ? '- ' + Math.abs(Math.round(q.components.repetitionPenalty)) : '+' + Math.round(q.components.repetitionPenalty)}</span></div>
                <div className="comp">Effort <span>{q.components.effortPenalty < 0 ? '- ' + Math.abs(Math.round(q.components.effortPenalty)) : '+' + Math.round(q.components.effortPenalty)}</span></div>
              </div>
            )}
          </div>
        ))}
      </div>

      <RoomInspector
        game={game}
        applyEffects={applyEffects}
      />

      <RoomStateDebug
        roomState={game.roomState}
      />
    </main>
  );
}

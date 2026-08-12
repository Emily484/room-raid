import {
  calculateDerivedState,
} from "../game/derivedState";
import { generateProposals } from '../game/reconciliation';

export default function RoomStateDebug({
  roomState,
  analysis,
  onApproveProposal,
}) {
  const derived =
    calculateDerivedState(
      roomState
    );

  const floorSum =
    (derived.floorClutter ?? 0) +
    (derived.exposedFloor ?? 0);

  const floorConsistent =
    Math.abs(floorSum - 100) < 0.001;

  return (
    <section className="room-debug">
      <h2>
        Developer Room Model
      </h2>

      <h3>Concrete State</h3>

      <pre>
        {JSON.stringify(
          roomState,
          null,
          2
        )}
      </pre>

      <h3>Derived State</h3>

      <h4>Consistency Check</h4>

      <pre>
        {`floorClutter + exposedFloor = ${floorSum.toFixed(2)} -> ${
          floorConsistent ? "OK" : "MISMATCH"
        }`}
      </pre>

      <pre>
        {JSON.stringify(
          derived,
          null,
          2
        )}
      </pre>

      {analysis && (
        <section className="reconciliation">
          <h3>Vision Reconciliation Proposals</h3>
          {(() => {
            const proposals = generateProposals({ roomState, analysis });
            if (!proposals || proposals.length === 0) return <div>No proposals</div>;

            return (
              <div>
                {proposals.map((p, i) => (
                  <div key={i} style={{ border: '1px solid #ccc', padding: 8, marginBottom: 6 }}>
                    <strong>{p.field}</strong>
                    <div>Current: {String(p.currentValue)}</div>
                    <div>Suggested: {p.proposedValue === null ? '—' : String(p.proposedValue)}</div>
                    <div>Confidence: {p.confidence ?? '—'}</div>
                    <div>Recommendation: {p.recommendation}</div>
                    <div style={{ marginTop: 6 }}>
                      <button onClick={() => onApproveProposal && onApproveProposal(p)} disabled={!p.proposedValue}>Accept</button>
                      <button style={{ marginLeft: 8 }} onClick={() => {/* keep current */}}>Keep Current</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      )}
    </section>
  );
}
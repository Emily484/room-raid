import {
  calculateDerivedState,
} from "../game/derivedState";
import { getField } from '../game/roomFields.js';
import { generateProposals } from '../game/reconciliation';

function StateRow({ label, value, fieldKey }) {
  let f = null;

  if (value && typeof value === 'object' && ('estimated' in value || 'observed' in value)) {
    f = value;
  } else if (fieldKey) {
    f = getField(undefined, fieldKey);
  }

  const isDerivedNumeric = typeof value === 'number' && !f;

  const estimated = isDerivedNumeric ? value : (f && typeof f.estimated === 'number' ? f.estimated : 0);
  const observed = isDerivedNumeric ? null : (f && typeof f.observed === 'number' ? f.observed : null);
  const confidence = isDerivedNumeric ? null : (f && typeof f.confidence === 'number' ? f.confidence : null);
  const lastObservedAt = isDerivedNumeric ? null : (f && f.lastObservedAt ? f.lastObservedAt : null);

  const showBar = Number.isFinite(estimated) && estimated <= 100;

  return (
    <div style={{ borderBottom: '1px solid #eee', padding: 8 }}>
      <strong>{label}</strong>
      <div>Estimated: {Number.isFinite(estimated) ? Number(estimated).toFixed(1) : '—'}</div>
      <div>Observed: {observed === null ? '—' : Number(observed).toFixed(1)}</div>
      <div>Confidence: {typeof confidence === 'number' ? Math.round(confidence * 100) + '%' : '—'}</div>
      <div>Last observed: {lastObservedAt ? new Date(lastObservedAt).toLocaleString() : 'Never'}</div>
    </div>
  );
}

export default function RoomStateDebug({
  roomState,
  analysis,
  onApproveProposal,
}) {
  const derived =
    calculateDerivedState(
      roomState
    );

    const floorSum = (derived.floorClutter ?? 0) + (derived.exposedFloor ?? 0);
    const floorConsistent = Math.abs(floorSum - 100) < 0.001;

    return (
      <section className="room-debug">
        <h2>Developer Room Model</h2>

        <h3>Concrete State</h3>

        <div className="concrete-state-list">
          {Object.entries(roomState).map(([key, val]) => (
            <div key={key} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
              <strong>{key}</strong>
              <div>Estimated: {getField(roomState, key).estimated}</div>
              <div>Observed: {getField(roomState, key).observed === null ? '—' : getField(roomState, key).observed}</div>
              <div>Confidence: {Math.round((getField(roomState, key).confidence ?? 0) * 100)}%</div>
              <div>Last observed: {getField(roomState, key).lastObservedAt ? new Date(getField(roomState, key).lastObservedAt).toLocaleString() : 'Never'}</div>
            </div>
          ))}
        </div>

        <h3>Derived State</h3>

        <h4>Consistency Check</h4>

        <pre>{`floorClutter + exposedFloor = ${floorSum.toFixed(2)} -> ${floorConsistent ? 'OK' : 'MISMATCH'}`}</pre>

        <pre>{JSON.stringify(derived, null, 2)}</pre>

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
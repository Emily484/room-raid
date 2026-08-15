import React, { useState } from "react";
import { Link } from 'react-router-dom';
import { calculateDerivedState } from "../../game/derivedState";
import { calculateRoomConfidence } from "../../game/roomFields";
import { SCAN_SLOTS } from '../../data/scanSlots';
import './RoomInspector.css';
import { generateProposals, getLatestCompletedAnalysis, isAnalysisStale, getEvidenceImages } from '../../game/reconciliation.js';
import { recordCalibrationFeedback, summarizeCalibration, getCalibrationRule, saveCalibrationRule, getEffectiveCalibrationRule, clearCalibrationRule, loadCalibrationRules, MIN_CALIBRATION_SAMPLES } from '../../game/calibration.js';
import { useEffect } from 'react';

const correctionFactors = {
  muchLess: 0.5,
  less: 0.75,
  more: 1.25,
  muchMore: 1.5,
};

export default function RoomInspector({
  game,
  applyEffects,
  observeField,
  approveObservedField,
  scanState,
}) {
  const derived = calculateDerivedState(
    game.roomState
  );

  const roomConfidence = calculateRoomConfidence(game.roomState);
  const roomConfidencePercent = Math.round(roomConfidence * 100);
  const TRUSTED_THRESHOLD = 0.75;

  const [directValues, setDirectValues] =
    useState({});

  const scan = scanState?.scan;
  const totalScanImages = scanState?.totalImages ?? 0;

  // Reconciliation: select latest completed analysis and generate proposals
  const latestAnalysis = getLatestCompletedAnalysis(scan);
  const stale = isAnalysisStale(scan, latestAnalysis);
  const proposals = latestAnalysis ? generateProposals({ roomState: game.roomState, analysis: latestAnalysis }) : [];
  const [calibrationInputs, setCalibrationInputs] = useState({});
  // Initialize summary synchronously so SSR and initial render reflect current persisted data
  const [calibrationSummary, setCalibrationSummary] = useState(() => {
    try {
      const s = summarizeCalibration();
      console.info('[diagnostic] RoomInspector init setCalibrationSummary', { count: s.length });
      return s;
    } catch (e) {
      return [];
    }
  });
  const [rulesVersion, setRulesVersion] = useState(0);

  useEffect(() => {
    try {
      const s = summarizeCalibration();
      console.info('[diagnostic] RoomInspector useEffect setCalibrationSummary', { count: s.length });
      setCalibrationSummary(s);
    } catch (e) {
      setCalibrationSummary(summarizeCalibration());
    }
  }, []);

  // helper to refresh rules-driven UI
  function refreshRules() {
    try {
      const s = summarizeCalibration();
      console.info('[diagnostic] RoomInspector refreshRules setCalibrationSummary', { count: s.length });
      setCalibrationSummary(s);
    } catch (e) {
      setCalibrationSummary(summarizeCalibration());
    }
    setRulesVersion(v => v + 1);
  }

  const fields = [
    {
      key: "clothingOnFloor",
      label: "Clothing on floor",
    },
    {
      key: "cardboard",
      label: "Cardboard",
    },
    {
      key: "floorTrash",
      label: "Floor trash",
    },
    {
      key: "miscellaneousFloorItems",
      label: "Misc floor objects",
    },
  ];

  function handleRelativeCorrection(
    key,
    type
  ) {
    const current =
      (game.roomState[key]?.estimated ?? 0);

    if (type === "looksRight") {
      return;
    }

    const factor =
      correctionFactors[type];

    const target =
      Math.round(current * factor);

    // Manual inspector corrections should be treated as observations.
    // Use the centralized observeField helper via the observeField prop
    // to set observed/estimated/confidence/lastObservedAt.
    if (typeof observeField === 'function') {
      observeField(key, target);
    } else {
      // fallback to inference if observeField not provided (shouldn't happen)
      const delta = target - current;
      applyEffects({ [key]: delta });
    }
  }

  function handleDirectChange(
    key,
    value
  ) {
    setDirectValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleDirectSet(key) {
    const rawValue =
      directValues[key];

    if (
      rawValue === undefined ||
      rawValue === ""
    ) {
      return;
    }

    const parsed =
      Number(rawValue);

    if (Number.isNaN(parsed)) {
      return;
    }

    const target =
      Math.max(
        0,
        Math.min(
          100,
          parsed
        )
      );

    if (typeof observeField === 'function') {
      observeField(key, target);
    } else {
      const current = (game.roomState[key]?.estimated ?? 0);
      const delta = target - current;
      applyEffects({ [key]: delta });
    }

    setDirectValues((current) => ({
      ...current,
      [key]: "",
    }));
  }

  return (
    <div className="room-inspector">
      <div id="room-inspector" />
      <aside className="scan-reference">
        <div className="scan-reference-header">
          <h4>CURRENT SCAN</h4>
          <div className="scan-reference-summary">
            <div>{totalScanImages} photos</div>
            <div>Updated {scan ? new Date(scan.updatedAt).toLocaleTimeString() : '-'}</div>
            <div>{scan?.status ?? 'Draft'}</div>
          </div>
        </div>

        <div className="scan-reference-grid">
          {scan && Object.entries(scan.slots).filter(([,items]) => (items?.length ?? 0) > 0).map(([slotId, items]) => (
            <div key={slotId} className="scan-reference-slot">
              <div className="slot-label">{(SCAN_SLOTS.find(s => s.id === slotId)?.label) ?? slotId}</div>
              <div className="scan-reference-thumbnails">
                {items.map((it) => (
                  <img key={it.id} src={it.url ?? it.previewUrl} alt={`${slotId} preview`} className="scan-reference-thumb" />
                ))}
              </div>
              <div className="slot-count">{items.length} photos</div>
            </div>
          ))}

          {(!scan || totalScanImages === 0) && (
            <div className="scan-reference-empty">
              <div>No scan photos attached.</div>
              <Link to="/scan">Add photos</Link>
            </div>
          )}
        </div>

        <div className="scan-reference-actions">
          <Link to="/scan">Edit Scan</Link>
        </div>
      </aside>
              
              <div className="reconciliation-panel">
                <h4>Vision Reconciliation</h4>
                {latestAnalysis ? (
                  <div>
                    {stale && (
                      <div className="stale-warning">
                        <div>Analysis is stale because the scan changed after it was analyzed. Run a fresh analysis before applying changes.</div>
                        <div style={{ marginTop: 8 }}>
                          <button onClick={async () => {
                            if (!scan || !scan.id) return;
                            try {
                              if (typeof scanState?.runAnalysis === 'function') {
                                await scanState.runAnalysis();
                                // refresh local summaries/rules
                                setCalibrationSummary(summarizeCalibration());
                                // force re-render of proposals by bumping rulesVersion
                                setRulesVersion(v => v + 1);
                              } else {
                                alert('Run analysis not available');
                              }
                            } catch (err) {
                              alert(String(err));
                            }
                          }}>Run fresh analysis</button>
                        </div>
                      </div>
                    )}

                    {proposals.map((p, idx) => {
                      const evidenceImages = getEvidenceImages(scan, p.evidence || []);
                      const effRule = getEffectiveCalibrationRule(p.field);
                      // if rulesVersion changes, React will rerender and recompute proposals
                      const activeOverride = (() => {
                        const overrides = loadCalibrationRules();
                        return overrides && overrides[p.field] ? overrides[p.field] : null;
                      })();

                      const displayValue = (v) => (v === null || v === undefined) ? '—' : String(v);

                      return (
                        <div key={idx} className="reconciliation-proposal">
                          <div className="reconciliation-field"><strong>{p.field}</strong></div>
                          <div className="reconciliation-values">
                            <div>Current: {displayValue(p.currentValue)}</div>
                            <div>Raw suggestion: {p.rawProposedValue === null || p.rawProposedValue === undefined ? '—' : displayValue(p.rawProposedValue)}</div>
                            <div>Calibrated suggestion: {p.proposedValue === null || p.proposedValue === undefined ? '—' : displayValue(p.proposedValue)}</div>
                            <div>Vision: {p.observation?.estimatedRange ? `${p.observation.estimatedRange.min}–${p.observation.estimatedRange.max}` : (p.observation?.percentEstimate ? `${p.observation.percentEstimate.min}–${p.observation.percentEstimate.max}%` : '')}</div>
                            <div className="reconciliation-confidence">Confidence: {p.confidence ?? '—'}</div>
                            <div className="reconciliation-reason">{p.rationale ?? p.reason}</div>
                            <div className="reconciliation-badge">{p.disagreement}</div>
                          </div>

                          {activeOverride && (
                            <div className="active-calibration" style={{ marginTop: 6 }}>
                              <div><strong>Active calibration:</strong></div>
                              <div>Multiplier: {activeOverride.multiplier}</div>
                              <div>Offset: {activeOverride.offset}</div>
                            </div>
                          )}

                          <div className="reconciliation-evidence">
                            <div className="evidence-label">EVIDENCE</div>
                            <div className="evidence-thumbs">
                              {evidenceImages.map((img, j) => (
                                <a key={j} href={img.url} target="_blank" rel="noreferrer" title={SCAN_SLOTS.find(s => s.id === img.slotId)?.label ?? img.slotId}>
                                  <img className="reconciliation-thumb" src={img.url} alt={`evidence ${img.id} (${img.slotId})`} />
                                </a>
                              ))}
                            </div>
                          </div>

                          <div className="reconciliation-actions">
                            <button disabled={stale || p.proposedValue === null} onClick={() => {
                              if (stale) return;
                              if (!p || typeof p.proposedValue !== 'number') return;
                              if (typeof approveObservedField === 'function') {
                                approveObservedField({ field: p.field, value: p.proposedValue, confidence: p.confidence, observedAt: latestAnalysis?.createdAt });
                              }
                            }}>Accept</button>
                            <button onClick={() => { /* keep current — no-op */ }}>Keep Current</button>
                          </div>

                          <div className="calibration-feedback">
                            <div><strong>How good was this estimate?</strong></div>
                            <div style={{ marginTop: 6 }}>
                              <label style={{ marginRight: 8 }}>
                                <input
                                  type="radio"
                                  name={`verdict-${p.field}`}
                                  value="accurate"
                                  checked={((calibrationInputs[p.field] && calibrationInputs[p.field].verdict) === 'accurate') || false}
                                  onChange={() => setCalibrationInputs(current => ({ ...current, [p.field]: { ...(current[p.field]||{}), verdict: 'accurate' } }))}
                                /> Accurate
                              </label>
                              <label style={{ marginRight: 8 }}>
                                <input
                                  type="radio"
                                  name={`verdict-${p.field}`}
                                  value="too_high"
                                  checked={((calibrationInputs[p.field] && calibrationInputs[p.field].verdict) === 'too_high') || false}
                                  onChange={() => setCalibrationInputs(current => ({ ...current, [p.field]: { ...(current[p.field]||{}), verdict: 'too_high' } }))}
                                /> Too High
                              </label>
                              <label style={{ marginRight: 8 }}>
                                <input
                                  type="radio"
                                  name={`verdict-${p.field}`}
                                  value="too_low"
                                  checked={((calibrationInputs[p.field] && calibrationInputs[p.field].verdict) === 'too_low') || false}
                                  onChange={() => setCalibrationInputs(current => ({ ...current, [p.field]: { ...(current[p.field]||{}), verdict: 'too_low' } }))}
                                /> Too Low
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  name={`verdict-${p.field}`}
                                  value="wrong_type"
                                  checked={((calibrationInputs[p.field] && calibrationInputs[p.field].verdict) === 'wrong_type') || false}
                                  onChange={() => setCalibrationInputs(current => ({ ...current, [p.field]: { ...(current[p.field]||{}), verdict: 'wrong_type' } }))}
                                /> Wrong Type
                              </label>
                            </div>

                            <div style={{ marginTop: 6 }}>
                              <label>
                                Corrected value (optional):
                                <input type="number" value={(calibrationInputs[p.field] && calibrationInputs[p.field].correctedValue) ?? ''} onChange={(e) => setCalibrationInputs(current => ({ ...current, [p.field]: { ...(current[p.field]||{}), correctedValue: e.target.value === '' ? '' : Number(e.target.value) } }))} style={{ marginLeft: 6, width: 100 }} />
                              </label>
                            </div>

                            <div style={{ marginTop: 6 }}>
                              <button onClick={() => {
                                const inpt = calibrationInputs[p.field] || {};
                                try {
                                  if (!inpt.verdict) {
                                    alert('Please select a verdict');
                                    return;
                                  }

                                  const payload = {
                                    analysisId: latestAnalysis?.id ?? null,
                                    scanId: scan?.id ?? null,
                                    field: p.field,
                                    currentValue: typeof p.currentValue === 'number' ? p.currentValue : null,
                                    rawVisionEstimate: p.observation?.estimatedRange ?? p.observation?.percentEstimate ?? null,
                                    proposedValue: typeof p.rawProposedValue === 'number' ? p.rawProposedValue : (typeof p.proposedValue === 'number' ? p.proposedValue : null),
                                    verdict: inpt.verdict,
                                    correctedValue: typeof inpt.correctedValue === 'number' ? inpt.correctedValue : null,
                                    confidence: typeof p.confidence === 'number' ? p.confidence : null,
                                  };

                                  recordCalibrationFeedback(payload);
                                  setCalibrationSummary(summarizeCalibration());
                                  // reset inputs for this proposal
                                  setCalibrationInputs(current => ({ ...current, [p.field]: {} }));
                                } catch (err) {
                                  alert(String(err));
                                }
                              }}>Save Feedback</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>No completed analyses</div>
                )}
              </div>
      <div className="room-inspector-panel">
        <h3>Room Model</h3>

        <div className="room-confidence">
          <div className="room-confidence-value">
            Room model confidence: {roomConfidencePercent}%
          </div>

          {roomConfidence >= TRUSTED_THRESHOLD ? (
            <div className="room-confidence-trusted">
              <div>✓ Recently verified</div>
            </div>
          ) : (
            <div className="room-confidence-low">
              <div>⚠ The dungeon may have shifted.</div>

              <button
                onClick={() => {
                  // Route user to manual verification workflow. We do not
                  // change any confidence here — actual verification occurs
                  // only when the user edits fields via observeField.
                  // As a lightweight affordance, focus the first field by
                  // calling observeField with the current estimated value
                  // (no-op observation) if provided; otherwise no-op.
                  if (typeof observeField === 'function') {
                    const firstKey = Object.keys(game.roomState)[0];
                    if (firstKey) {
                      const val = game.roomState[firstKey]?.estimated ?? 0;
                      // no-op: this will set observed=estimated and confidence=1
                      // only if the user actually confirms — but this action
                      // should not auto-verify. Keep it as a harmless focus
                      // affordance; if you prefer, we can instead navigate or
                      // open UI; for now we leave it conservative.
                      // NOTE: per requirements, VERIFY STATE must not itself
                      // mark the room verified; the user must confirm edits.
                    }
                  }
                }}
              >
                VERIFY STATE
              </button>
            </div>
          )}
        </div>

        <div className="room-model-grid">
          {fields.map((field) => (
            <div
              key={field.key}
              className="room-state-item"
            >
              <div className="room-state-item-header">
                <span className="room-state-label">
                  {field.label}
                </span>

                <strong className="room-state-value">
                  {String(game.roomState[field.key]?.estimated ?? 0)}
                </strong>
              </div>

              <div className="room-adjustments">
                <button
                  onClick={() =>
                    handleRelativeCorrection(
                      field.key,
                      "muchLess"
                    )
                  }
                >
                  Much less
                </button>

                <button
                  onClick={() =>
                    handleRelativeCorrection(
                      field.key,
                      "less"
                    )
                  }
                >
                  Less
                </button>

                <button
                  onClick={() =>
                    handleRelativeCorrection(
                      field.key,
                      "looksRight"
                    )
                  }
                >
                  Looks right
                </button>

                <button
                  onClick={() =>
                    handleRelativeCorrection(
                      field.key,
                      "more"
                    )
                  }
                >
                  More
                </button>

                <button
                  onClick={() =>
                    handleRelativeCorrection(
                      field.key,
                      "muchMore"
                    )
                  }
                >
                  Much more
                </button>
              </div>

              <div className="room-direct-set">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={
                    directValues[
                      field.key
                    ] ?? ""
                  }
                  placeholder="Direct"
                  onChange={(event) =>
                    handleDirectChange(
                      field.key,
                      event.target
                        .value
                    )
                  }
                />

                <button
                  onClick={() =>
                    handleDirectSet(
                      field.key
                    )
                  }
                >
                  Set
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="derived-state-panel">
        <div className="derived-divider">
          <span>DERIVED</span>
        </div>

        <div className="derived-grid">
          <div className="derived-metric">
            <span>
              Floor clutter
            </span>

            <strong>
              {derived.floorClutter.toFixed(
                2
              )}
            </strong>
          </div>

          <div className="derived-metric">
            <span>
              Exposed floor
            </span>

            <strong>
              {derived.exposedFloor.toFixed(
                2
              )}
            </strong>
          </div>

          <div className="derived-metric">
            <span>
              Floor readiness
            </span>

            <strong>
              {derived.floorReadiness.toFixed(
                2
              )}
            </strong>
          </div>
        </div>
      </div>

      <div className="calibration-summary-panel">
        <h3>Calibration Summary</h3>
        {calibrationSummary.length === 0 ? (
          <div>No calibration feedback recorded yet.</div>
        ) : (
          <div>
            {calibrationSummary.map((s) => (
              <div key={s.field} style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                <strong>{s.field}</strong>
                <div>Samples: {s.samples}</div>
                <div>Accurate: {s.accurate} · Too high: {s.too_high} · Too low: {s.too_low} · Wrong type: {s.wrong_type}</div>
                <div>Mean signed error: {s.meanSignedError === null ? '—' : s.meanSignedError.toFixed(2)}</div>
                <div>Mean absolute error: {s.meanAbsoluteError === null ? '—' : s.meanAbsoluteError.toFixed(2)}</div>
                <div>Suggested offset: {s.suggestedOffset === null ? '—' : s.suggestedOffset}</div>
                <div>Enough samples: {s.enoughSamples ? 'Yes' : `No (need ${MIN_CALIBRATION_SAMPLES})`}</div>
                {s.enoughSamples && (
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => {
                      const eff = getEffectiveCalibrationRule(s.field);
                      if (!eff) {
                        alert('No calibration rule available for this field');
                        return;
                      }

                      const confirmed = confirm(`Apply suggested offset ${s.suggestedOffset} to ${s.field}? This will persist the override to localStorage.`);
                      if (!confirmed) return;

                      try {
                        saveCalibrationRule(s.field, { multiplier: eff.multiplier, offset: s.suggestedOffset });
                        alert('Calibration rule persisted locally. Future proposals will show calibrated values.');
                        refreshRules();
                      } catch (err) {
                        alert(String(err));
                      }
                    }}>Apply Calibration Rule</button>

                    <button style={{ marginLeft: 8 }} onClick={() => {
                      // Reset calibration for this field
                      const confirmed = confirm(`Reset calibration for ${s.field}? This will remove any persisted override.`);
                      if (!confirmed) return;
                      try {
                        clearCalibrationRule(s.field);
                        refreshRules();
                      } catch (err) {
                        alert(String(err));
                      }
                    }}>Reset Calibration</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
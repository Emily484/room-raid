import { useState } from "react";
import { Link } from 'react-router-dom';
import { calculateDerivedState } from "../../game/derivedState";
import { calculateRoomConfidence } from "../../game/roomFields";
import { SCAN_SLOTS } from '../../data/scanSlots';
import './RoomInspector.css';

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
                  <img key={it.id} src={it.previewUrl} alt={`${slotId} preview`} className="scan-reference-thumb" />
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
    </div>
  );
}
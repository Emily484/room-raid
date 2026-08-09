import { useState } from "react";
import { calculateDerivedState } from "../../game/derivedState";

const correctionFactors = {
  muchLess: 0.5,
  less: 0.75,
  more: 1.25,
  muchMore: 1.5,
};

export default function RoomInspector({
  game,
  applyEffects,
}) {
  const derived = calculateDerivedState(
    game.roomState
  );

  const [directValues, setDirectValues] =
    useState({});

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
      game.roomState[key] ?? 0;

    if (type === "looksRight") {
      return;
    }

    const factor =
      correctionFactors[type];

    const target =
      Math.round(current * factor);

    const delta =
      target - current;

    applyEffects({
      [key]: delta,
    });
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

    const current =
      game.roomState[key] ?? 0;

    const delta =
      target - current;

    applyEffects({
      [key]: delta,
    });

    setDirectValues((current) => ({
      ...current,
      [key]: "",
    }));
  }

  return (
    <div className="room-inspector">
      <div className="room-inspector-panel">
        <h3>Room Model</h3>

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
                  {
                    game.roomState[
                      field.key
                    ]
                  }
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
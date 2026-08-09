import { useState } from "react";
import { calculateDerivedState } from "../../game/derivedState";

export default function RoomInspector({
  game,
  applyEffects,
}) {
  const derived =
    calculateDerivedState(
      game.roomState
    );

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
                  {game.roomState[field.key]}
                </strong>
              </div>

              <div className="room-adjustments">
                <button>
                  Much less
                </button>

                <button>
                  Less
                </button>

                <button>
                  Looks right
                </button>

                <button>
                  More
                </button>

                <button>
                  Much more
                </button>
              </div>

              <div className="room-direct-set">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Direct"
                />

                <button>
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
              {derived.floorClutter.toFixed(2)}
            </strong>
          </div>

          <div className="derived-metric">
            <span>
              Exposed floor
            </span>

            <strong>
              {derived.exposedFloor.toFixed(2)}
            </strong>
          </div>

          <div className="derived-metric">
            <span>
              Floor readiness
            </span>

            <strong>
              {derived.floorReadiness.toFixed(2)}
            </strong>
          </div>
        </div>

        <button className="correct-state-button">
          Correct Room State
        </button>
      </div>
    </div>
  );
}
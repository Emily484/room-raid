import {
  calculateDerivedState,
} from "../../game/derivedState";

const concreteLabels = {
  clothingOnFloor: "Clothing on floor",
  looseClothing: "Loose clothing",
  cleanClothesOut: "Clean clothes out",

  cardboard: "Cardboard",
  loosePackaging: "Loose packaging",

  floorTrash: "Floor trash",
  miscellaneousFloorItems: "Misc floor objects",
  floorObstruction: "Floor obstruction",
  floorCleanliness: "Floor cleanliness",

  tableTrash: "Table trash",
  surfaceClutter: "Surface clutter",
  surfaceCleanliness: "Surface cleanliness",

  bedClutter: "Bed clutter",
  bedMade: "Bed made",

  loungeClutter: "Lounge clutter",
  shelfDisorganization: "Shelf disorganization",

  bathroomCounterClutter: "Bathroom counter clutter",
  sinkCleanliness: "Sink cleanliness",
  mirrorDirty: "Mirror dirtiness",

  tubClutter: "Tub clutter",
  tubCleanliness: "Tub cleanliness",
};

const derivedLabels = {
  floorClutter: "Floor clutter",
  exposedFloor: "Exposed floor",
  floorReadiness: "Floor readiness",
  exposedSurface: "Exposed surface",
  bathroomCounterClear: "Bathroom counter clear",
};

function StateRow({
  label,
  value,
}) {
  const numericValue =
    typeof value === "number"
      ? value
      : 0;

  return (
    <div className="debug-state-row">
      <div className="debug-state-label">
        {label}
      </div>

      <div className="debug-state-bar">
        <div
          className="debug-state-fill"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, numericValue)
            )}%`,
          }}
        />
      </div>

      <div className="debug-state-value">
        {typeof value === "number"
          ? value.toFixed(1)
          : String(value)}
      </div>
    </div>
  );
}

export default function RoomStateDebug({
  roomState,
}) {
  const derived =
    calculateDerivedState(
      roomState
    );

  return (
    <div className="room-state-debug">
      <div className="debug-state-section">
        <div className="debug-state-heading">
          <div>
            <span className="debug-state-kicker">
              SOURCE OF TRUTH
            </span>

            <h3>
              Concrete State
            </h3>
          </div>

          <span className="debug-state-count">
            {
              Object.keys(
                roomState
              ).length
            }{" "}
            metrics
          </span>
        </div>

        <div className="debug-state-list">
          {Object.entries(
            roomState
          ).map(
            ([key, value]) => (
              <StateRow
                key={key}
                label={
                  concreteLabels[
                    key
                  ] ?? key
                }
                value={value}
              />
            )
          )}
        </div>
      </div>

      <div className="debug-state-section">
        <div className="debug-state-heading">
          <div>
            <span className="debug-state-kicker">
              CALCULATED
            </span>

            <h3>
              Derived State
            </h3>
          </div>
        </div>

        <div className="debug-state-list">
          {Object.entries(
            derived
          ).map(
            ([key, value]) => (
              <StateRow
                key={key}
                label={
                  derivedLabels[
                    key
                  ] ?? key
                }
                value={value}
              />
            )
          )}
        </div>
      </div>

      <details className="raw-json-details">
        <summary>
          View raw JSON
        </summary>

        <div className="raw-json-grid">
          <div>
            <h4>
              Concrete
            </h4>

            <pre>
              {JSON.stringify(
                roomState,
                null,
                2
              )}
            </pre>
          </div>

          <div>
            <h4>
              Derived
            </h4>

            <pre>
              {JSON.stringify(
                derived,
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}
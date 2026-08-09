import {
  calculateDerivedState,
} from "../game/derivedState";

export default function RoomStateDebug({
  roomState,
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
    </section>
  );
}
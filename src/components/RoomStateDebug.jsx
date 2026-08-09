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
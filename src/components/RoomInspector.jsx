import { useState } from "react";
import { calculateDerivedState } from "../game/derivedState";

export default function RoomInspector({ game, applyEffects }) {
  const [manualEdits, setManualEdits] = useState({});

  const rs = game.roomState;
  const derived = calculateDerivedState(rs);

  const keys = [
    { key: "clothingOnFloor", label: "Clothing on floor" },
    { key: "cardboard", label: "Cardboard" },
    { key: "floorTrash", label: "Floor trash" },
    { key: "miscellaneousFloorItems", label: "Misc floor objects" },
  ];

  const correctionFactors = {
    muchLess: 0.5,
    less: 0.75,
    correct: 1,
    more: 1.25,
    muchMore: 1.5,
  };

  function applyCorrection(key, factorKey) {
    const factor = correctionFactors[factorKey];
    const current = rs[key] ?? 0;
    const newValue = Math.round(current * factor);

    applyEffects({ [key]: { operation: "set", value: newValue } });
  }

  function applyManualSet(key) {
    const raw = manualEdits[key];
    if (raw === undefined || raw === "") return;

    const value = Number(raw);
    if (Number.isNaN(value)) return;

    applyEffects({ [key]: { operation: "set", value: value } });
    setManualEdits((s) => ({ ...s, [key]: "" }));
  }

  return (
    <section className="room-inspector">
      <h2>ROOM MODEL</h2>

      <div className="concrete-list">
        {keys.map((item) => (
          <div key={item.key} className="row">
            <div className="label">{item.label}</div>
            <div className="value">{rs[item.key]}</div>

            <div className="corrections">
              <button onClick={() => applyCorrection(item.key, "muchLess")}>Much less</button>
              <button onClick={() => applyCorrection(item.key, "less")}>Less</button>
              <button onClick={() => applyCorrection(item.key, "correct")}>Looks right</button>
              <button onClick={() => applyCorrection(item.key, "more")}>More</button>
              <button onClick={() => applyCorrection(item.key, "muchMore")}>Much more</button>
            </div>

            <div className="manual">
              <input
                type="number"
                min={0}
                max={100}
                value={manualEdits[item.key] ?? ""}
                onChange={(e) => setManualEdits((s) => ({ ...s, [item.key]: e.target.value }))}
                placeholder="Direct edit"
              />
              <button onClick={() => applyManualSet(item.key)}>Set</button>
            </div>
          </div>
        ))}
      </div>

      <hr />

      <h3>──────── DERIVED ────────</h3>

      <div className="derived-list">
        <div className="row">
          <div className="label">Floor clutter</div>
          <div className="value">{derived.floorClutter.toFixed(2)}</div>
        </div>

        <div className="row">
          <div className="label">Exposed floor</div>
          <div className="value">{derived.exposedFloor.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <button onClick={() => applyEffects({})}>[ CORRECT ROOM STATE ]</button>
      </div>
    </section>
  );
}

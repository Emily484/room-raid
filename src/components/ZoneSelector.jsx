import { zones } from "../data/zones";

export default function ZoneSelector({
  selectedZone,
  setSelectedZone,
}) {
  return (
    <section>
      <h2>Focus Territory</h2>

      <p className="zone-help">
        Smart Run lets the quest engine
        choose from the entire dungeon.
      </p>

      <div className="zone-buttons">
        <button
          className={selectedZone === "random" ? "active" : ""}
          onClick={() => setSelectedZone("random")}
        >
          🧠 Smart Run
        </button>

        {zones.map((zone) => (
          <button
            key={zone.id}
            className={selectedZone === zone.id ? "active" : ""}
            onClick={() => setSelectedZone(zone.id)}
          >
            {zone.name}
          </button>
        ))}
      </div>
    </section>
  );
}
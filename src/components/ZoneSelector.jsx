import { zones } from "../data/zones";

export default function ZoneSelector({
  selectedZone,
  setSelectedZone,
}) {
  return (
    <section>
      <h2>Choose Your Battlefield</h2>

      <div className="zone-buttons">
        <button
          className={selectedZone === "random" ? "active" : ""}
          onClick={() => setSelectedZone("random")}
        >
          🎲 Surprise Me
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
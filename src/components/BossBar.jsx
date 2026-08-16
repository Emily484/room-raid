import React from 'react';
import { zones } from "../data/zones";

export default function BossBar({ zoneId, bosses }) {
  if (!zoneId || zoneId === "random") {
    return null;
  }

  const zone = zones.find((zone) => zone.id === zoneId);
  const boss = bosses[zoneId];

  const percentage = (boss.hp / boss.maxHp) * 100;

  return (
    <section className="boss">
      <div className="boss-heading">
        <div>
          <span>BOSS</span>
          <h2>{zone.boss}</h2>
        </div>

        <strong>
          {boss.hp} / {boss.maxHp} HP
        </strong>
      </div>

      <div className="boss-bar">
        <div
          className="boss-health"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {boss.hp === 0 && (
        <p className="victory">
          ☠️ {zone.boss} HAS BEEN DEFEATED
        </p>
      )}
    </section>
  );
}
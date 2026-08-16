import React from 'react';

export default function PlayerStats({ xp, completedQuests }) {
  const level = Math.floor(xp / 100) + 1;
  const currentLevelXp = xp % 100;

  return (
    <section className="stats">
      <div>
        <span>LEVEL</span>
        <strong>{level}</strong>
      </div>

      <div>
        <span>XP</span>
        <strong>{xp}</strong>
      </div>

      <div>
        <span>QUESTS SLAIN</span>
        <strong>{completedQuests}</strong>
      </div>

      <div className="xp-progress">
        <span>Next level</span>

        <div className="bar">
          <div
            className="bar-fill"
            style={{ width: `${currentLevelXp}%` }}
          />
        </div>
      </div>
    </section>
  );
}
import RoomStateDebug from "./RoomStateDebug";
import RoomInspector from "./RoomInspector";

export default function DeveloperPage({ game, applyEffects }) {
  return (
    <main className="developer-page">
      <div className="dev-banner">DEVELOPER MODE — Developer Tools</div>
      <h1 style={{ fontSize: 22, margin: '8px 0 12px 0', color: 'var(--accent)' }}>Developer Tools</h1>

      <RoomInspector
        game={game}
        applyEffects={applyEffects}
      />

      <RoomStateDebug
        roomState={game.roomState}
      />
    </main>
  );
}

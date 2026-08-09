import RoomStateDebug from "./RoomStateDebug";
import RoomInspector from "./RoomInspector";

export default function DeveloperPage({ game, applyEffects }) {
  return (
    <main className="developer-page">
      <h1>Developer Tools</h1>

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

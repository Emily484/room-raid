import {
  useEffect,
  useState,
} from "react";

import PlayerStats from "./components/PlayerStats";
import ZoneSelector from "./components/ZoneSelector";
import BossBar from "./components/BossBar";
import QuestCard from "./components/QuestCard";
import RoomStateDebug from "./components/RoomStateDebug";
import DeveloperPage from "./components/DeveloperPage";
import { Routes, Route, NavLink } from "react-router-dom";

import {
  getNextQuest,
} from "./game/questEngine";

import {
  useGameState,
} from "./hooks/useGameState";

function App() {
  const [
    selectedZone,
    setSelectedZone,
  ] = useState("random");

  const [
    currentQuest,
    setCurrentQuest,
  ] = useState(null);

  // routing handled by react-router

  const [
    difficulty,
    setDifficulty,
  ] = useState(0);

  const [
    message,
    setMessage,
  ] = useState(
    "The dungeon awaits."
  );

  const {
    game,
    completeQuest,
    resetGame,
    applyEffectsToRoom,
  } = useGameState();

  // --------------------------------
  // Generate a quest whenever:
  //
  // - zone changes
  // - room state changes
  // - permanent quests are completed
  // --------------------------------

  useEffect(() => {
    const quest =
      getNextQuest(
        selectedZone,
        game.roomState,
        game.completedQuestIds,
        game.recentQuestIds
      );

    setCurrentQuest(quest);
    setDifficulty(0);

    if (!quest) {
      setMessage(
        "No quests are currently available in this territory."
      );
    }
  }, [
    selectedZone,
    game.roomState,
    game.completedQuestIds,
    game.recentQuestIds,
  ]);

  function newQuest() {
    const quest =
      getNextQuest(
        selectedZone,
        game.roomState,
        game.completedQuestIds,
        game.recentQuestIds,
        currentQuest?.id
      );

    setCurrentQuest(quest);
    setDifficulty(0);

    if (quest) {
      setMessage(
        "A different horror approaches."
      );
    } else {
      setMessage(
        "No other quests are currently available."
      );
    }
  }

  function handleComplete(
    variantKey
  ) {
    if (!currentQuest) {
      return;
    }

    const reward =
      completeQuest(
        currentQuest,
        variantKey
      );

    setMessage(
      `⚔️ Enemy slain. +${reward.xpEarned} XP. ${reward.damage} damage dealt.`
    );

    // Do NOT manually generate
    // another quest here.
    //
    // game.roomState changes,
    // which triggers the useEffect
    // above with fresh state.
  }

  function handleFuckThis() {
    if (!currentQuest) {
      return;
    }

    if (difficulty < 2) {
      setDifficulty(
        (current) =>
          current + 1
      );

      setMessage(
        difficulty === 0
          ? "Fine. The quest has been made less awful."
          : "Jesus Christ. One tiny thing. That's it."
      );
    } else {
      setMessage(
        "This quest literally cannot get smaller."
      );
    }
  }

  function changeZone(zone) {
    setSelectedZone(zone);

    setDifficulty(0);

    setMessage(
      "Entering new territory..."
    );

    // useEffect handles the
    // new quest.
  }

  function handleReset() {
    resetGame();

    setDifficulty(0);

    setMessage(
      "The dungeon has been restored to its original horrible condition."
    );
  }

  return (
    <>
      <nav className="breadcrumb">
        <NavLink to="/" className={({isActive}) => isActive ? 'current' : ''}>Home</NavLink>
        <span className="sep">›</span>
        <NavLink to="/dev" className={({isActive}) => isActive ? 'current' : ''}>Developer</NavLink>
      </nav>

      <Routes>
      <Route
        path="/"
        element={
          <main className="app">
            <header>
              <div>
                <p className="eyebrow">CLEANING RPG</p>

                <h1>ROOM RAID</h1>

                <p>Your possessions have become hostile.</p>
              </div>
            </header>

            <PlayerStats xp={game.xp} completedQuests={game.completedQuests} />

            <ZoneSelector
              selectedZone={selectedZone}
              setSelectedZone={changeZone}
            />

            <BossBar zoneId={selectedZone} bosses={game.bosses} />

            <p className="message">{message}</p>

            {currentQuest ? (
              <QuestCard
                quest={currentQuest}
                difficulty={difficulty}
                onComplete={handleComplete}
                onFuckThis={handleFuckThis}
                onReroll={newQuest}
              />
            ) : (
              <section className="quest-card">
                <div className="quest-label">QUEST LOG</div>

                <h2>No quests available.</h2>

                <p>
                  This territory may be cleared, or later tasks may still be
                  locked.
                </p>
              </section>
            )}

            <button className="reset" onClick={handleReset}>
              Reset Game
            </button>
          </main>
        }
      />

      <Route
        path="/dev"
        element={<DeveloperPage game={game} applyEffects={applyEffectsToRoom} />}
      />
      </Routes>
    </>
  );
}

export default App;
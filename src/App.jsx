import {
  useEffect,
  useState,
} from "react";

import {
  Routes,
  Route,
  NavLink,
} from "react-router-dom";

import PlayerStats from "./components/PlayerStats";
import ZoneSelector from "./components/ZoneSelector";
import BossBar from "./components/BossBar";
import QuestCard from "./components/QuestCard";
import SessionControls from "./components/SessionControls";

import DeveloperPage from "./components/DevPage/DeveloperPage";
import ScanPage from "./components/ScanPage/ScanPage";
import { useScanState } from "./hooks/useScanState";

import {
  getNextQuest,
} from "./game/questEngine";
import {
  useGameState,
} from "./hooks/useGameState";

function getQuestReason(quest) {
  if (!quest) {
    return "";
  }

  if (quest.tags?.includes("boss")) {
    return "Boss vulnerability detected";
  }

  if (quest.stage >= 3) {
    return "Advances dungeon progression";
  }

  if (quest.priority >= 90) {
    return "High-impact problem";
  }

  if (quest.priority >= 75) {
    return "Strong next move";
  }

  return "Useful progress";
}

function App() {
  const [
    selectedZone,
    setSelectedZone,
  ] = useState("random");

  const [
    currentQuest,
    setCurrentQuest,
  ] = useState(null);

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

  const [
    session,
    setSession,
  ] = useState({
    energy: "normal",
    preferredQuestMinutes: 10,
  });

  const {
    game,
    completeQuest,
    resetGame,
    applyEffectsToRoom,
    observeFieldInRoom,
    approveObservedField,
  } = useGameState();

  // Shared scan state for /scan and the Room Inspector (Developer page).
  const scanState = useScanState();

  useEffect(() => {
    const quest =
      getNextQuest(
        selectedZone,
        game.roomState,
        game.completedQuestIds,
        game.recentQuestIds,
        null,
        session
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
    session,
  ]);

  function newQuest() {
    const quest =
      getNextQuest(
        selectedZone,
        game.roomState,
        game.completedQuestIds,
        game.recentQuestIds,
        currentQuest?.id,
        session
      );

    setCurrentQuest(quest);
    setDifficulty(0);

    setMessage(
      quest
        ? "A different horror approaches."
        : "No other quests are currently available."
    );
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
      `⚔ Quest complete. +${reward.xpEarned} XP · ${reward.damage} damage dealt.`
    );
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
          ? "Fine. The quest has been reduced."
          : "One tiny thing. That's the entire assignment."
      );
    } else {
      setMessage(
        "This quest cannot physically get smaller."
      );
    }
  }

  function changeZone(zone) {
    setSelectedZone(zone);

    setDifficulty(0);

    setMessage(
      zone === "random"
        ? "The engine is surveying the entire dungeon."
        : "Focusing on selected territory."
    );
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
      <nav className="site-nav">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive
              ? "current"
              : ""
          }
        >
          Room Raid
        </NavLink>

        <NavLink
          to="/scan"
          className={({ isActive }) =>
            isActive
              ? "current"
              : ""
          }
        >
          Scan Room
        </NavLink>

        <NavLink
          to="/dev"
          className={({ isActive }) =>
            isActive
              ? "current"
              : ""
          }
        >
          Developer
        </NavLink>
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <main className="app">
              <header className="game-header">
                <p className="eyebrow">
                  CLEANING RPG
                </p>

                <h1>
                  ROOM RAID
                </h1>

                <p>
                  Your possessions have
                  become hostile.
                </p>
              </header>

              <PlayerStats
                xp={game.xp}
                completedQuests={
                  game.completedQuests
                }
              />

              <SessionControls
                session={session}
                setSession={
                  setSession
                }
              />

              <ZoneSelector
                selectedZone={
                  selectedZone
                }
                setSelectedZone={
                  changeZone
                }
              />

              {selectedZone !==
                "random" && (
                <BossBar
                  zoneId={
                    selectedZone
                  }
                  bosses={
                    game.bosses
                  }
                />
              )}

              <div className="game-message">
                {message}
              </div>

              {currentQuest ? (
                <QuestCard
              observeField={observeFieldInRoom}
                  quest={
                    currentQuest
                  }
                  difficulty={
                    difficulty
                  }
                  reason={getQuestReason(
                    currentQuest
                  )}
                  onComplete={
                    handleComplete
                  }
                  onFuckThis={
                    handleFuckThis
                  }
                  onReroll={
                    newQuest
                  }
                />
              ) : (
                <section className="quest-card">
                  <div className="quest-label">
                    QUEST LOG
                  </div>

                  <h2>
                    No quests available.
                  </h2>

                  <p>
                    This territory may
                    be cleared or its
                    remaining tasks may
                    still be locked.
                  </p>
                </section>
              )}

              <details className="game-settings">
                <summary>
                  Game settings
                </summary>

                <button
                  className="reset"
                  onClick={
                    handleReset
                  }
                >
                  Reset Game
                </button>
              </details>
            </main>
          }
        />

        <Route
          path="/dev"
          element={
            <DeveloperPage
              game={game}
              applyEffects={
                applyEffectsToRoom
              }
              observeField={observeFieldInRoom}
              approveObservedField={approveObservedField}
              scanState={scanState}
            />
          }
        />
        <Route
          path="/scan"
          element={<ScanPage scanState={scanState} />}
        />
      </Routes>
    </>
  );
}

export default App;
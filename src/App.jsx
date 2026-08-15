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
  explainQuestScore,
} from "./game/questEngine";
import { quests } from './data/quests';
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

  // currentQuestId is persisted in game state; local currentQuest derives from it
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
    setCurrentQuestId,
  } = useGameState();

  // Shared scan state for /scan and the Room Inspector (Developer page).
  const scanState = useScanState();

  // Hydrate persisted currentQuestId on mount (only once) and set currentQuest
  useEffect(() => {
    const id = game.currentQuestId;
    if (id) {
      const q = quests.find((x) => x.id === id) || null;
      // If quest no longer exists, clear persisted id and pick a new quest safely
      if (!q) {
        setCurrentQuestId(null);
        const pick = getNextQuest(selectedZone, game.roomState, game.completedQuestIds, game.recentQuestIds, null, session);
        if (pick) setCurrentQuestId(pick.id);
        setCurrentQuest(pick);
      } else {
        setCurrentQuest(q);
      }
    } else {
      // No persisted current quest: pick one safely and persist it
      const pick = getNextQuest(selectedZone, game.roomState, game.completedQuestIds, game.recentQuestIds, null, session);
      if (pick) setCurrentQuestId(pick.id);
      setCurrentQuest(pick);
    }

    setDifficulty(0);
    if (!game.currentQuestId && !currentQuest) {
      setMessage(
        "No quests are currently available in this territory."
      );
    }
    // Intentionally run only on mount/hydration; do not re-run on roomState changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setCurrentQuestId(quest ? quest.id : null);
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
    // Persist next quest selection (pick a new quest after completion)
    const pick = getNextQuest(selectedZone, game.roomState, game.completedQuestIds, game.recentQuestIds, null, session);
    setCurrentQuest(pick);
    setCurrentQuestId(pick ? pick.id : null);
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
    // clear persisted active quest
    setCurrentQuest(null);
    setCurrentQuestId(null);
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
                  explanation={
                    currentQuest
                      ? explainQuestScore(
                          currentQuest,
                          game.roomState,
                          game.recentQuestIds,
                          session
                        )
                      : null
                  }
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
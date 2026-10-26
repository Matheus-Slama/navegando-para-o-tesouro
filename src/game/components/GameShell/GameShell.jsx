'use client';

import { useEffect, useMemo, useState } from 'react';
import { useJourney } from '@/game/hooks/useJourney';
import { PHASES } from '@/game/config/phases';
import { TUTORIAL_STEPS } from '@/game/config/tutorial';
import { generateGraphForPhase } from '@/game/core/graphGenerator';
import { createRandomSeed } from '@/game/core/random';
import { StartScreen } from '@/game/components/StartScreen/StartScreen';
import { TutorialScreen } from '@/game/components/TutorialScreen/TutorialScreen';
import { DijkstraTutorialMap } from '@/game/components/DijkstraTutorial/DijkstraTutorialMap';
import { GameBoard } from '@/game/components/GameBoard/GameBoard';
import { PauseGame } from '@/game/components/PauseGame/PauseGame';
import { DijkstraUnlock } from '@/game/components/DijkstraUnlock/DijkstraUnlock';
import { useMapLayout } from '@/game/hooks/useMapLayout';
import './GameShell.css';

export function GameShell() {
  const layout = useMapLayout();
  const [previousLayout, setPreviousLayout] = useState(layout);
  const [screen, setScreen] = useState('start');
  const [paused, setPaused] = useState(false);
  const [dijkstraAnnounced, setDijkstraAnnounced] = useState(false);
  const [highlightDijkstra, setHighlightDijkstra] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [mapSeed, setMapSeed] = useState(null);
  const [selectedStartId, setSelectedStartId] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [raceResult, setRaceResult] = useState(null);
  const [devMode, setDevMode] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [routeStyle, setRouteStyle] = useState('chevrons');
  const phase = PHASES[phaseIndex];
  const showDijkstraUnlock = screen === 'game' && phase.enableDijkstraTutorial && !dijkstraAnnounced;
  const journey = useJourney(screen === 'game' && !paused && !showDijkstraUnlock && !selectedStartId && !raceResult);

  useEffect(() => {
    if (screen === 'start' || showDijkstraUnlock) return;
    function handleKeyDown(event) {
      if (paused) {
        if (event.key === 'Escape' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
      if (event.key !== 'Escape' || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPaused(true);
    }
    function pauseGame() { setPaused(true); }
    function handleVisibility() {
      if (document.visibilityState === 'hidden') pauseGame();
    }
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', pauseGame);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', pauseGame);
    };
  }, [screen, paused, showDijkstraUnlock]);

  const pauseModal = paused ? <PauseGame score={journey.score} highscore={journey.highscore} onResume={() => setPaused(false)} onBackToMenu={returnToMenu} /> : null;

  // Ao girar a tela, mantém a fase e pede uma nova escolha no mapa adaptado.
  if (previousLayout !== layout) {
    setPreviousLayout(layout);
    if (!raceResult) setSelectedStartId(null);
    setHintOpen(false);
  }

  const graph = useMemo(() => {
    if (mapSeed === null) return null;
    return generateGraphForPhase(phase, mapSeed, layout);
  }, [phase, mapSeed, layout]);

  function startGame() {
    setDijkstraAnnounced(false);
    setHighlightDijkstra(false);
    journey.reset();
    setPhaseIndex(0);
    setMapSeed(createRandomSeed(mapSeed));
    setSelectedStartId(null);
    setRaceResult(null);
    setScreen('game');
  }

  function openTutorial() {
    setDijkstraAnnounced(false);
    setHighlightDijkstra(false);
    journey.reset();
    setPhaseIndex(0);
    setMapSeed(createRandomSeed(mapSeed));
    setSelectedStartId(null);
    setRaceResult(null);
    setScreen('tutorial');
  }

  function startPhase() {
    journey.reset();
    setSelectedStartId(null);
    setRaceResult(null);
    setScreen('game');
  }

  function returnToMenu() {
    setPaused(false);
    journey.reset();
    setPhaseIndex(0);
    setMapSeed(null);
    setSelectedStartId(null);
    setRaceResult(null);
    setScreen('start');
  }

  function selectBoat(startId) {
    if (paused || showDijkstraUnlock || selectedStartId || raceResult || journey.lives === 0) return;
    journey.freeze();
    setSelectedStartId(startId);
    setRaceResult(null);
    setAnimationKey((value) => value + 1);
  }

  function finishRace() {
    if (!selectedStartId || raceResult) return;
    const won = selectedStartId === graph.results.winner.startId;
    journey.finish(won, phase);
    setRaceResult(won ? 'victory' : 'defeat');
  }

  function continueAfterRace() {
    if (journey.lives === 0) {
      returnToMenu();
      return;
    }
    if (raceResult === 'victory' && phaseIndex === PHASES.length - 1) {
      startGame();
      return;
    }
    journey.resetClock();
    setMapSeed(createRandomSeed(mapSeed));
    if (raceResult === 'victory' && phaseIndex < PHASES.length - 1) {
      setPhaseIndex((value) => value + 1);
    }

    setSelectedStartId(null);
    setRaceResult(null);
  }

  function regenerateMap() {
    journey.resetClock();
    setMapSeed(createRandomSeed(mapSeed));
    setSelectedStartId(null);
    setRaceResult(null);
    setAnimationKey((value) => value + 1);
  }

  function selectDevPhase(nextPhaseIndex) {
    journey.resetClock();
    setPhaseIndex(nextPhaseIndex);
    setMapSeed(createRandomSeed(mapSeed));
    setSelectedStartId(null);
    setRaceResult(null);
    setAnimationKey((value) => value + 1);
    setHintOpen(false);
    setHintIndex(0);
  }

  function acknowledgeDijkstra() {
    setDijkstraAnnounced(true);
    setHighlightDijkstra(true);
  }

  if (screen === 'start') {
    return (
      <main className="game-page">
        <StartScreen
          highscore={journey.highscore}
          onStart={startGame}
          onTutorial={openTutorial}
        />
      </main>
    );
  }

  if (screen === 'tutorial') {
    return <main className="game-page"><TutorialScreen onPause={() => setPaused(true)} steps={TUTORIAL_STEPS} onFinish={startPhase} onBackToMenu={returnToMenu} layout={layout} paused={paused} />{pauseModal}</main>;
  }

  if (screen === 'dijkstra-tutorial') {
    return (
      <main className="game-page">
        <DijkstraTutorialMap
          paused={paused}
          onExit={() => setScreen('game')}
          onPlay={() => setScreen('game')}
          layout={layout}
          routeStyle={routeStyle}
          onChangeRouteStyle={setRouteStyle}
        />
        {pauseModal}
      </main>
    );
  }

  return (
    <main className="game-page">
      <GameBoard
        paused={paused || showDijkstraUnlock}
        highlightDijkstra={highlightDijkstra || showDijkstraUnlock}
        onPause={() => setPaused(true)}
        journey={journey}
        graph={graph}
        phase={phase}
        phaseIndex={phaseIndex}
        totalPhases={PHASES.length}
        selectedStartId={selectedStartId}
        animationKey={animationKey}
        onSelectStart={selectBoat}
        onWinnerArrive={finishRace}
        raceResult={raceResult}
        onContinue={continueAfterRace}
        onBackToMenu={returnToMenu}
        devMode={devMode}
        onToggleDevMode={() => setDevMode((value) => !value)}
        onRegenerateMap={regenerateMap}
        phases={PHASES}
        onSelectPhase={selectDevPhase}
        hintOpen={hintOpen}
        hint={phase.hints[hintIndex % phase.hints.length]}
        onOpenHint={() => setHintOpen(true)}
        onCloseHint={() => setHintOpen(false)}
        onNextHint={() => setHintIndex((value) => (value + 1) % phase.hints.length)}
        routeStyle={routeStyle}
        onChangeRouteStyle={setRouteStyle}
        onDijkstraTutorial={() => {
          setHighlightDijkstra(false);
          setScreen('dijkstra-tutorial');
        }}
      />
      {showDijkstraUnlock && <DijkstraUnlock onContinue={acknowledgeDijkstra} />}
      {pauseModal}
    </main>
  );
}

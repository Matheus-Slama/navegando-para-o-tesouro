'use client';

import { useCallback, useMemo, useState } from 'react';
import { PHASES } from '@/game/config/phases';
import { TUTORIAL_STEPS } from '@/game/config/tutorial';
import { generateGraphForPhase } from '@/game/core/graphGenerator';
import { StartScreen } from '@/game/components/StartScreen/StartScreen';
import { TutorialScreen } from '@/game/components/TutorialScreen/TutorialScreen';
import { DijkstraTutorialMap } from '@/game/components/DijkstraTutorial/DijkstraTutorialMap';
import { GameBoard } from '@/game/components/GameBoard/GameBoard';
import { useMapLayout } from '@/game/hooks/useMapLayout';
import './GameShell.css';

export function GameShell() {
  const layout = useMapLayout();
  const [previousLayout, setPreviousLayout] = useState(layout);
  const [screen, setScreen] = useState('start');
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [seedNonce, setSeedNonce] = useState(1);
  const [selectedStartId, setSelectedStartId] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [raceResult, setRaceResult] = useState(null);
  const [devMode, setDevMode] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [routeStyle, setRouteStyle] = useState('chevrons');
  const phase = PHASES[phaseIndex];

  // Ao girar a tela, mantém a fase e pede uma nova escolha no mapa adaptado.
  if (previousLayout !== layout) {
    setPreviousLayout(layout);
    setSelectedStartId(null);
    setRaceResult(null);
    setHintOpen(false);
  }

  const graph = useMemo(() => {
    const baseSeed = phase.id * 1000 + seedNonce * 101;
    return generateGraphForPhase(phase, baseSeed, layout);
  }, [phase, seedNonce, layout]);

  function startGame() {
    setPhaseIndex(0);
    setSeedNonce((value) => value + 1);
    setSelectedStartId(null);
    setRaceResult(null);
    setScreen('game');
  }

  function openTutorial() {
    setPhaseIndex(0);
    setSeedNonce((value) => value + 1);
    setSelectedStartId(null);
    setRaceResult(null);
    setScreen('tutorial');
  }

  function startPhase() {
    setSelectedStartId(null);
    setRaceResult(null);
    setScreen('game');
  }

  function selectBoat(startId) {
    if (selectedStartId) return;
    setSelectedStartId(startId);
    setRaceResult(null);
    setAnimationKey((value) => value + 1);
  }

  const finishRace = useCallback(() => {
    setRaceResult(selectedStartId === graph.results.winner.startId ? 'victory' : 'defeat');
  }, [graph.results.winner.startId, selectedStartId]);

  function continueAfterRace() {
    if (raceResult === 'victory' && phaseIndex < PHASES.length - 1) {
      setPhaseIndex((value) => value + 1);
      setSeedNonce((value) => value + 1);
    } else if (raceResult === 'victory') {
      setPhaseIndex(0);
      setSeedNonce((value) => value + 1);
    }

    setSelectedStartId(null);
    setRaceResult(null);
  }

  function regenerateMap() {
    setSeedNonce((value) => value + 1);
    setSelectedStartId(null);
    setRaceResult(null);
    setAnimationKey((value) => value + 1);
  }

  function selectDevPhase(nextPhaseIndex) {
    setPhaseIndex(nextPhaseIndex);
    setSeedNonce((value) => value + 1);
    setSelectedStartId(null);
    setRaceResult(null);
    setAnimationKey((value) => value + 1);
    setHintOpen(false);
    setHintIndex(0);
  }

  if (screen === 'start') {
    return (
      <main className="game-page">
        <StartScreen
          onStart={startGame}
          onTutorial={openTutorial}
          onDijkstraTutorial={() => setScreen('dijkstra-tutorial')}
        />
      </main>
    );
  }

  if (screen === 'tutorial') {
    return <main className="game-page"><TutorialScreen steps={TUTORIAL_STEPS} onFinish={startPhase} layout={layout} /></main>;
  }

  if (screen === 'dijkstra-tutorial') {
    return (
      <main className="game-page">
        <DijkstraTutorialMap
          onExit={() => setScreen('start')}
          layout={layout}
        />
      </main>
    );
  }

  return (
    <main className="game-page">
      <GameBoard
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
      />
    </main>
  );
}

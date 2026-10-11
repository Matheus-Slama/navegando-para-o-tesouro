'use client';

import { useState } from 'react';
import { useScreenMusic } from '@/game/hooks/useScreenMusic';
import { PHASES } from '@/game/config/phases';
import { TUTORIAL_GRAPH } from '@/game/config/tutorial';
import { MapGraph } from '@/game/components/MapGraph/MapGraph';
import { TreasureAnchor } from '@/game/components/TreasureAnchor/TreasureAnchor';
import { BoatDock } from '@/game/components/BoatDock/BoatDock';
import { GameHint } from '@/game/components/GameHint/GameHint';
import { GameHintNavigation } from '@/game/components/GameHint/GameHintNavigation';
import './TutorialScreen.css';
import { getMapProfile } from '@/game/core/map-layout';

const TUTORIAL_PHASE = PHASES[0];

export function TutorialScreen({ steps, onFinish, onBackToMenu, layout = 'mobile', paused = false }) {
  const musicRef = useScreenMusic(paused);
  const graph = { ...TUTORIAL_GRAPH, metadata: { ...TUTORIAL_GRAPH.metadata, layout } };
  const [index, setIndex] = useState(0);
  const current = steps[index];
  const isLast = index === steps.length - 1;
  const treasure = TUTORIAL_GRAPH.nodes.find((node) => node.type === 'finish');
  const boats = TUTORIAL_GRAPH.nodes.filter((node) => node.type === 'start');

  function next() {
    if (isLast) {
      onFinish();
      return;
    }

    setIndex((value) => value + 1);
  }

  return (
    <section className="tutorial-screen" data-step={index} data-layout={layout}>
      <audio ref={musicRef} src="/assets/game/audio/music-tutorial.wav" loop preload="auto" />
      <picture className="tutorial-screen__background">
        <img src={getMapProfile(layout).asset} alt="" />
      </picture>

      <div className="tutorial-screen__map" inert>
        <MapGraph graph={graph} phase={TUTORIAL_PHASE} selectedStartId={null} animationKey={1} onWinnerArrive={() => {}} routeStyle="arrows-white" />
        <TreasureAnchor node={treasure} phaseIndex={0} totalPhases={steps.length} />
        <BoatDock
          boats={boats}
          selectedStartId={null}
          onSelect={() => {}}
        />
      </div>

      <button type="button" className="tutorial-screen__menu-button" onClick={onBackToMenu}>
        Voltar ao menu
      </button>
      <GameHint title={current.title} label="Regras do jogo" dock="top-right" footer={
        <GameHintNavigation
          index={index}
          total={steps.length}
          onPrevious={() => setIndex((value) => Math.max(0, value - 1))}
          onNext={next}
          nextLabel={isLast ? 'Começar fase 1' : 'Próximo passo'}
          nextTitle={isLast ? 'Começar fase 1 (→)' : 'Avançar (→)'}
        />
      }>
        <p>{current.text}</p>
      </GameHint>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PHASES } from '@/game/config/phases';
import { TUTORIAL_GRAPH } from '@/game/config/tutorial';
import { MapGraph } from '@/game/components/MapGraph/MapGraph';
import { TreasureAnchor } from '@/game/components/TreasureAnchor/TreasureAnchor';
import { BoatDock } from '@/game/components/BoatDock/BoatDock';
import './TutorialScreen.css';

const TUTORIAL_PHASE = PHASES[0];

export function TutorialScreen({ steps, onFinish }) {
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
    <section className="tutorial-screen" data-step={index}>
      <picture className="tutorial-screen__background">
        <img src="/assets/game/backgrounds/game-map-mobile.png" alt="" />
      </picture>

      <div className="tutorial-screen__map" inert>
        <MapGraph graph={TUTORIAL_GRAPH} phase={TUTORIAL_PHASE} selectedStartId={null} animationKey={1} onWinnerArrive={() => {}} routeStyle="arrows-white" />
        <TreasureAnchor node={treasure} phaseIndex={0} totalPhases={steps.length} />
        <BoatDock
          boats={boats}
          selectedStartId={null}
          onSelect={() => {}}
        />
        <span className="tutorial-screen__hint-icon">
          <Image src="/assets/game/ui/hint-lantern.png" alt="" width={1254} height={1254} sizes="64px" />
        </span>
      </div>

      <div className="tutorial-screen__backdrop">
        <article className="tutorial-screen__card" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
          <div className="tutorial-screen__copy">
            <h1 id="tutorial-title">{current.title}</h1>
            <p>{current.text}</p>
          </div>

          <div className="tutorial-screen__actions">
            {index > 0 && (
              <button type="button" className="tutorial-screen__secondary" onClick={() => setIndex(index - 1)}>
                Voltar
              </button>
            )}

            <button type="button" onClick={next}>
              {isLast ? 'Começar fase 1' : 'Próximo'}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

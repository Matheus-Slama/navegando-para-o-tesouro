import Image from 'next/image';
import { BoatDock } from '@/game/components/BoatDock/BoatDock';
import { TreasureAnchor } from '@/game/components/TreasureAnchor/TreasureAnchor';
import { MapGraph } from '@/game/components/MapGraph/MapGraph';
import { RaceResult } from '@/game/components/RaceResult/RaceResult';
import { DevPanel } from '@/game/components/DevPanel/DevPanel';
import './GameBoard.css';

export function GameBoard({
  graph,
  phase,
  phaseIndex,
  totalPhases,
  selectedStartId,
  animationKey,
  onSelectStart,
  onWinnerArrive,
  raceResult,
  onContinue,
  devMode,
  onToggleDevMode,
  onRegenerateMap,
  phases,
  onSelectPhase,
  hintOpen,
  hint,
  onOpenHint,
  onCloseHint,
  onNextHint
}) {
  const treasure = graph.nodes.find((node) => node.type === 'finish');
  const boats = graph.nodes.filter((node) => node.type === 'start');

  return (
    <section className="game-board">
      <picture className="game-board__background">
        <img
          src="/assets/game/backgrounds/game-map-mobile.png"
          alt=""
          fetchPriority="high"
        />
      </picture>

      <button
        className="game-board__hint-button"
        type="button"
        onClick={onOpenHint}
        aria-label={`Abrir dica da fase ${phase.id}`}
      >
        <Image
          src="/assets/game/ui/hint-lantern.png"
          alt=""
          width={1254}
          height={1254}
          sizes="64px"
          priority
        />
      </button>

      {hintOpen && (
        <div className="game-board__hint-backdrop" role="presentation">
          <section className="game-board__hint-modal" role="dialog" aria-modal="true" aria-label={`Dica da fase ${phase.id}`}>
            <button className="game-board__hint-close" type="button" onClick={onCloseHint} aria-label="Fechar dica">×</button>
            <p className="game-board__hint-text">{hint}</p>
            <div className="game-board__hint-actions">
              <button type="button" onClick={onCloseHint}>Entendi</button>
              {phase.hints.length > 1 && <button type="button" onClick={onNextHint}>Outra dica</button>}
            </div>
          </section>
        </div>
      )}

      <DevPanel
        open={devMode}
        graph={graph}
        phase={phase}
        phaseIndex={phaseIndex}
        phases={phases}
        onToggle={onToggleDevMode}
        onSelectPhase={onSelectPhase}
        onRegenerateMap={onRegenerateMap}
      />

      <MapGraph graph={graph} phase={phase} selectedStartId={selectedStartId} animationKey={animationKey} onWinnerArrive={onWinnerArrive} />

      <TreasureAnchor
        node={treasure}
        phaseIndex={phaseIndex}
        totalPhases={totalPhases}
      />
      <BoatDock
        boats={boats}
        selectedStartId={selectedStartId}
        onSelect={onSelectStart}
      />

      <RaceResult
        result={raceResult}
        selectedBoat={boats.find((boat) => boat.id === selectedStartId)}
        winner={boats.find((boat) => boat.id === graph.results.winner.startId)}
        isFinalPhase={phaseIndex === totalPhases - 1}
        onContinue={onContinue}
      />

    </section>
  );
}

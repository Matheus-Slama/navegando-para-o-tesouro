import { GameHint } from '@/game/components/GameHint/GameHint';
import { useScreenMusic } from '@/game/hooks/useScreenMusic';
import { GameHud } from '@/game/components/GameHud/GameHud';
import { BoatDock } from '@/game/components/BoatDock/BoatDock';
import { TreasureAnchor } from '@/game/components/TreasureAnchor/TreasureAnchor';
import { MapGraph } from '@/game/components/MapGraph/MapGraph';
import { RaceResult } from '@/game/components/RaceResult/RaceResult';
import { DevPanel } from '@/game/components/DevPanel/DevPanel';
import './GameBoard.css';
import { getMapProfile } from '@/game/core/map-layout';

export function GameBoard({
  paused = false,
  highlightDijkstra = false,
  onPause,
  journey,
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
  onNextHint,
  routeStyle,
  onChangeRouteStyle,
  onDijkstraTutorial
}) {
  const musicRef = useScreenMusic(paused);
  const treasure = graph.nodes.find((node) => node.type === 'finish');
  const boats = graph.nodes.filter((node) => node.type === 'start');
  const mapProfile = getMapProfile(graph.metadata.layout);

  return (
    <section className="game-board" data-layout={graph.metadata.layout}>
      <audio ref={musicRef} src="/assets/game/audio/blackmoor-tides-loop.wav" loop preload="auto" />
      <picture className="game-board__background">
        <img
          src={mapProfile.asset}
          alt=""
          fetchPriority="high"
        />
      </picture>
      <div className="game-board__content" style={{
        '--map-frame-x': `${1600 / mapProfile.sourceSize.width}%`,
        '--map-frame-y': `${1600 / mapProfile.sourceSize.height}%`
      }}>
        <GameHud lives={journey.lives} elapsed={journey.elapsed} score={journey.score} />
        <GameHint
          onPause={onPause}
          highlightDijkstra={highlightDijkstra}
          title={`Dica da fase ${phase.id}`}
          label={`Dica da fase ${phase.id}`}
          routeStyle={routeStyle}
          onChangeRouteStyle={onChangeRouteStyle}
          onDijkstraTutorial={phase.difficulty.includes('difícil') ? onDijkstraTutorial : undefined}
          minimized={!hintOpen}
          onMinimizedChange={(value) => value ? onCloseHint() : onOpenHint()}
          footer={
            <div className="game-hint__actions">
              <button type="button" onClick={onCloseHint}>Entendi</button>
              {phase.hints.length > 1 && <button type="button" onClick={onNextHint}>Outra dica</button>}
            </div>
          }
        >
          <p>{hint}</p>
        </GameHint>

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

        <div className="game-board__map">
          <MapGraph graph={graph} phase={phase} selectedStartId={selectedStartId} animationKey={animationKey} onWinnerArrive={onWinnerArrive} routeStyle={routeStyle} paused={paused} />

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
        </div>

        <RaceResult
          lives={journey.lives}
          score={journey.score}
          highscore={journey.highscore}
          result={raceResult}
          selectedBoat={boats.find((boat) => boat.id === selectedStartId)}
          winner={boats.find((boat) => boat.id === graph.results.winner.startId)}
          isFinalPhase={phaseIndex === totalPhases - 1}
          onContinue={onContinue}
        />

      </div>
    </section>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PHASES } from '@/game/config/phases';
import { DIJKSTRA_FIXED_PHASE, getDijkstraFixedMap } from '@/game/config/dijkstra-fixed-map';
import { createDijkstraWalkthrough } from '@/game/core/dijkstra-walkthrough';
import { getMapProfile, getNodeRadii } from '@/game/core/map-layout';
import { MapGraph } from '@/game/components/MapGraph/MapGraph';
import { TreasureAnchor } from '@/game/components/TreasureAnchor/TreasureAnchor';
import { BoatDock } from '@/game/components/BoatDock/BoatDock';
import { GameHint } from '@/game/components/GameHint/GameHint';
import { GameHintNavigation } from '@/game/components/GameHint/GameHintNavigation';
import '@/game/components/GameBoard/GameBoard.css';
import './DijkstraTutorialMap.css';

const cost = (value) => Number.isFinite(value) ? value : '∞';
const highlightInfinity = (text) => text.split(/(∞)/).map((part, index) => part === '∞'
  ? <span className="dijkstra-fixed-map__infinity" key={index}>∞</span> : part);

export function DijkstraTutorialMap({ onExit, onPlay, layout = 'mobile', routeStyle = 'chevrons', onChangeRouteStyle }) {
  const [run, setRun] = useState(0);
  // Os formatos usam mapas distintos: uma mudança de formato reinicia as contas.
  return <DijkstraWalkthrough key={`${layout}-${run}`} onExit={onExit} onPlay={onPlay} onRestart={() => setRun((value) => value + 1)} layout={layout} routeStyle={routeStyle} onChangeRouteStyle={onChangeRouteStyle} />;
}

function DijkstraWalkthrough({ onExit, onPlay, onRestart, layout, routeStyle, onChangeRouteStyle }) {
  const [index, setIndex] = useState(0);
  const [comparedBoat, setComparedBoat] = useState('start-blue');
  const graph = getDijkstraFixedMap(layout);
  const walkthroughs = useMemo(() => Object.fromEntries(graph.results.all.map((result) => [
    result.startId, createDijkstraWalkthrough(graph, result.startId)
  ])), [graph]);
  const frames = walkthroughs['start-blue'];
  const isComplete = index === frames.length;
  const frame = frames[Math.min(index, frames.length - 1)];
  const comparing = !isComplete && frame.step === 9;
  const selectedBoatId = frame.step === 9 ? comparedBoat : 'start-blue';
  const current = frame.step === 9 ? walkthroughs[comparedBoat].at(-1) : frame;
  const totalScenes = frames.length + 1;
  const treasure = graph.nodes.find((node) => node.type === 'finish');
  const boats = graph.nodes.filter((node) => node.type === 'start');
  const focus = graph.nodes.filter((node) => node.id === current.currentId || node.id === current.targetId);
  const focusY = focus.length ? focus.reduce((sum, node) => sum + node.y, 0) / focus.length : 500;
  const focusX = focus.length ? focus.reduce((sum, node) => sum + node.x, 0) / focus.length : 380;
  const dock = (focusY < 300 ? 'bottom' : 'top') + '-' + (focusX > 500 ? 'left' : 'right');
  const winner = graph.results.winner;

  const previousStep = useCallback(() => setIndex((value) => Math.max(0, value - 1)), []);
  const nextStep = useCallback(() => {
    setIndex((value) => Math.min(frames.length, value + 1));
  }, [frames.length]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select'))) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') previousStep();
      else nextStep();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previousStep, nextStep]);

  return (
    <section className="game-board dijkstra-fixed-map" data-layout={layout} aria-label="Tutorial Dijkstra: mapa fixo da última fase">
      <picture className="game-board__background">
        <img src={getMapProfile(layout).asset} alt="" fetchPriority="high" />
      </picture>

      <MapGraph graph={graph} phase={DIJKSTRA_FIXED_PHASE} selectedStartId={null} routeStyle={routeStyle} highlightedEdgeIds={current.edgeIds} />
      <TreasureAnchor node={treasure} phaseIndex={PHASES.length - 1} totalPhases={PHASES.length} />
      <div inert><BoatDock boats={boats} selectedStartId={null} /></div>

      <div className="dijkstra-fixed-map__annotations" aria-label="Custos acumulados no mapa">
        {graph.nodes.map((node) => {
          const active = node.id === current.currentId || node.id === current.targetId;
          const confirmed = current.confirmed.includes(node.id);
          const onPath = current.path.includes(node.id);
          const radii = getNodeRadii(node, graph.metadata.dense, layout);
          return <div key={node.id}>
            {(active || onPath || confirmed) && <span className="dijkstra-fixed-map__halo" aria-hidden="true" data-active={active || onPath} data-confirmed={confirmed}
              style={{ left: node.x / 10 + '%', top: node.y / 6.5 + '%', width: radii.x / 5 + '%', height: radii.y / 3.25 + '%' }} />}
            {current.showCosts && (node.type !== 'start' || node.id === selectedBoatId) && <span className="dijkstra-fixed-map__cost" data-node-id={node.id} data-active={active || onPath} data-confirmed={confirmed} data-type={node.type}
              style={{ left: node.x / 10 + '%', top: node.y / 6.5 + '%' }}
              aria-label={node.label + ': custo ' + cost(current.distances[node.id]) + (confirmed ? ', confirmado' : ', provisório')}
              title={node.label + ' · Custo: ' + cost(current.distances[node.id]) + (current.previous[node.id] ? ' · Anterior: ' + graph.nodes.find((item) => item.id === current.previous[node.id]).label : '')}>
              <strong data-infinite={!Number.isFinite(current.distances[node.id])}>{cost(current.distances[node.id])}{confirmed ? ' ✓' : ''}</strong>
            </span>}
          </div>;
        })}
      </div>

      <button className="dijkstra-fixed-map__exit" type="button" onClick={onExit}>← Voltar ao jogo</button>

      <GameHint title={isComplete ? 'Tutorial concluído!' : frame.title} label="Regras de Dijkstra" routeStyle={routeStyle} onChangeRouteStyle={onChangeRouteStyle} dock={dock} className={`dijkstra-fixed-map__hint${comparing ? ' dijkstra-fixed-map__hint--comparison' : ''}`} footer={isComplete ? (
        <div className="dijkstra-fixed-map__completion-actions">
          <button type="button" onClick={onRestart}>Reiniciar tutorial</button>
          <button type="button" onClick={onPlay}>Voltar ao jogo</button>
        </div>
      ) : (
        <GameHintNavigation
          index={index}
          total={totalScenes}
          onPrevious={previousStep}
          onNext={nextStep}
          nextLabel={index === frames.length - 1 ? 'Concluir tutorial' : 'Próximo passo'}
          nextTitle={index === frames.length - 1 ? 'Concluir (→)' : 'Avançar (→)'}
          keyboardShortcuts
        />
      )}>
        <p>{isComplete
          ? 'Você concluiu o tutorial de Dijkstra! Agora é sua vez de encontrar o caminho de menor custo até o tesouro. Reinicie para rever os passos ou volte ao jogo para praticar.'
          : comparing ? 'Cada barco começa do zero. Toque abaixo para comparar as rotas.' : highlightInfinity(frame.text)}</p>
        {!isComplete && frame.formula && <p className="dijkstra-fixed-map__formula">{highlightInfinity(frame.formula)}</p>}
        {comparing &&
          <div className="dijkstra-fixed-map__comparison" aria-label="Comparar custos dos barcos">
            {graph.results.all.map((result) => <button key={result.startId} type="button" data-boat={result.boat} aria-pressed={comparedBoat === result.startId} onClick={() => setComparedBoat(result.startId)}>
              {result.label.replace('Barco ', '')}: {result.distance}{result.startId === winner.startId ? ' ★' : ''}
            </button>)}
          </div>
        }
      </GameHint>
    </section>
  );
}

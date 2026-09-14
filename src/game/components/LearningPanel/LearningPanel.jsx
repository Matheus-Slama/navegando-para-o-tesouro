'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  advanceDijkstraExercise,
  createDijkstraExercise,
  formatCost,
  getLearningRoutes,
  getNodeLabel,
  getRouteWeights
} from '@/game/core/learning';
import './LearningPanel.css';

export function LearningPanel({ graph, phase, startId, onComplete, onCancel, onFocusNode, onHighlightPath }) {
  const titleId = useId();
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);

  return (
    <aside className="learning-panel" aria-labelledby={titleId}>
      <div className="learning-panel__header">
        <div>
          <p className="learning-panel__eyebrow">Pratique antes da corrida</p>
          <h2 id={titleId} tabIndex={-1} ref={titleRef}>{phase.id < 5 ? 'Compare os caminhos' : 'Dijkstra passo a passo'}</h2>
        </div>
        <button type="button" className="learning-panel__cancel" onClick={onCancel}>Voltar ao mapa</button>
      </div>
      <p className="learning-panel__origin">Origem desta análise: <strong>{getNodeLabel(graph, startId)}</strong>.</p>
      <p className="learning-panel__rules">{phase.directed
        ? 'As setas indicam o sentido permitido. Todos os pesos são positivos.'
        : 'As conexões permitem os dois sentidos. Some os pesos, independentemente do tamanho da linha.'}</p>
      {phase.id < 5
        ? <CostExercise graph={graph} phase={phase} startId={startId} onComplete={onComplete} onHighlightPath={onHighlightPath} />
        : <DijkstraExercise graph={graph} phase={phase} startId={startId} onComplete={onComplete} onFocusNode={onFocusNode} onHighlightPath={onHighlightPath} />}
    </aside>
  );
}

function RouteView({ graph, route, title, onHighlightPath }) {
  return (
    <div className="learning-panel__route">
      <div className="learning-panel__route-heading">
        <strong>{title}</strong>
        <span>{route.weights.length} conexões</span>
        {onHighlightPath && <button type="button" onClick={() => onHighlightPath(route.path)} aria-label={`Destacar ${title.toLowerCase()} no mapa`}>Ver no mapa</button>}
      </div>
      <p>{route.path.map((nodeId, index) => (
        <span key={`${nodeId}-${index}`}>
          {index > 0 && <span className="learning-panel__edge"> → <b aria-label={`peso ${route.weights[index - 1]}`}>({route.weights[index - 1]})</b> → </span>}
          {getNodeLabel(graph, nodeId)}
        </span>
      ))}</p>
      <p className="learning-panel__sum">Pesos a somar: {route.weights.join(' + ')}</p>
    </div>
  );
}

function CostExercise({ graph, phase, startId, onComplete, onHighlightPath }) {
  const routes = useMemo(() => getLearningRoutes(graph, phase, startId), [graph, phase, startId]);
  const [costs, setCosts] = useState(['', '']);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [feedback, setFeedback] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [complete, setComplete] = useState(false);
  const formId = useId();
  const comparing = routes.length > 1;

  function submit(event) {
    event.preventDefault();
    if (complete || !routes.length) return;
    const wrongIndex = routes.findIndex((route, index) => costs[index].trim() === '' || Number(costs[index]) !== route.distance);
    if (wrongIndex !== -1) {
      setMistakes((value) => value + 1);
      setFeedback(`Revise a rota ${String.fromCharCode(65 + wrongIndex)}: some todos os pesos, incluindo a primeira conexão do barco e a última até o tesouro.`);
      return;
    }
    const chosen = Number(selectedRoute);
    if (comparing && (selectedRoute === '' || routes[chosen]?.distance !== Math.min(...routes.map((route) => route.distance)))) {
      setMistakes((value) => value + 1);
      setFeedback('As somas estão corretas. Compare os totais e escolha a rota de menor custo.');
      return;
    }
    setComplete(true);
    onComplete({ mistakes });
  }

  if (!routes.length) return <p role="alert">Este barco não tem caminho até o tesouro. Volte ao mapa para escolher outra origem.</p>;

  return (
    <form className="learning-panel__exercise" onSubmit={submit}>
      <p>{phase.id === 3 ? 'Um começo barato pode levar a um custo total maior. Compare as rotas completas.'
        : phase.id === 4 ? 'Mais conexões podem custar menos. Compare os pesos, além da quantidade de etapas.'
          : comparing ? 'Calcule os custos de duas rotas que partem do mesmo barco.' : 'Encontre o custo total deste caminho até o tesouro.'}</p>
      {routes.map((route, index) => (
        <div key={route.path.join('|')}>
          <RouteView graph={graph} route={route} title={`Rota ${String.fromCharCode(65 + index)}`} onHighlightPath={onHighlightPath} />
          <label className="learning-panel__field" htmlFor={`${formId}-cost-${index}`}>
            Custo total da rota {String.fromCharCode(65 + index)}
            <input id={`${formId}-cost-${index}`} type="number" inputMode="numeric" min="0" step="1" required value={costs[index]}
              onChange={(event) => setCosts((values) => values.map((value, offset) => offset === index ? event.target.value : value))} />
          </label>
        </div>
      ))}
      {comparing && (
        <label className="learning-panel__field" htmlFor={`${formId}-route`}>Qual das duas rotas custa menos?
          <select id={`${formId}-route`} required value={selectedRoute} onChange={(event) => setSelectedRoute(event.target.value)}>
            <option value="">Escolha uma rota</option>
            {routes.map((route, index) => <option value={index} key={index}>Rota {String.fromCharCode(65 + index)}</option>)}
          </select>
        </label>
      )}
      <p className="learning-panel__feedback" role="status" aria-live="polite">{feedback}</p>
      <button className="learning-panel__primary" type="submit" disabled={complete}>Conferir e iniciar corrida</button>
    </form>
  );
}

function DijkstraExercise({ graph, phase, startId, onComplete, onFocusNode, onHighlightPath }) {
  const [state, setState] = useState(() => createDijkstraExercise(graph, startId, phase.directed));
  const [feedback, setFeedback] = useState('Use 0 para a origem e ∞ para custos ainda desconhecidos.');
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState('');
  const formId = useId();
  const questionRef = useRef(null);
  const label = (id) => getNodeLabel(graph, id);
  const target = state.pending[0];
  const finishedRoute = state.stage === 'cost' || state.stage === 'complete';

  useEffect(() => {
    // Cada nova tarefa volta ao enunciado para não perder o foco ao trocar campos.
    questionRef.current?.focus();
  }, [state.stage, state.currentId, target?.target]);

  function perform(action) {
    const result = advanceDijkstraExercise(graph, state, action);
    setState(result.state);
    setFeedback(result.message);
    if (result.correct) {
      setValue('');
      setChoice('');
      onFocusNode?.(result.focusNode);
      if (result.state.stage === 'cost') onHighlightPath?.([...result.state.route].reverse());
      if (result.state.stage === 'complete') onComplete({ mistakes: result.state.mistakes });
    }
  }

  function submit(event) {
    event.preventDefault();
    if (state.stage === 'initialize') perform({ type: 'initialize', startCost: value, otherCost: choice });
    if (state.stage === 'relax') perform({ type: 'relax', candidateCost: value, decision: choice });
    if (state.stage === 'cost') perform({ type: 'cost', cost: value });
  }

  const question = state.stage === 'initialize' ? '1. Defina os custos iniciais'
    : state.stage === 'choose' ? '2. Escolha o menor vértice pendente'
      : state.stage === 'relax' ? `3. Analise a conexão até ${label(target.target)}`
        : state.stage === 'confirm' ? `4. Confirme ${label(state.currentId)}`
          : state.stage === 'reconstruct' ? `5. Quem é o antecessor de ${label(state.route.at(-1))}?`
            : finishedRoute ? '6. Confira o caminho mínimo' : 'Não há caminho disponível';

  return (
    <div className="learning-panel__exercise">
      <h3 className="learning-panel__question" tabIndex={-1} ref={questionRef}>{question}</h3>
      <p className="learning-panel__feedback" role="status" aria-live="polite">{feedback}</p>
      <form className="learning-panel__task" onSubmit={submit}>
        {state.stage === 'initialize' && <>
          <label className="learning-panel__field" htmlFor={`${formId}-value`}>Custo de {label(startId)}
            <input id={`${formId}-value`} type="number" min="0" step="1" inputMode="numeric" required value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
          <label className="learning-panel__field" htmlFor={`${formId}-choice`}>Custo inicial das demais ilhas
            <select id={`${formId}-choice`} required value={choice} onChange={(event) => setChoice(event.target.value)}>
              <option value="">Escolha</option><option value="zero">0 — já conhecemos o custo</option><option value="infinity">∞ — custo ainda desconhecido</option>
            </select>
          </label>
          <button type="submit" className="learning-panel__primary">Conferir inicialização</button>
        </>}
        {state.stage === 'choose' && <p>Use os botões da tabela. Compare <strong>todos</strong> os custos pendentes. O tesouro só encerra a busca quando for o menor pendente.</p>}
        {state.stage === 'relax' && <>
          <p>Conexão: <strong>{label(state.currentId)} → {label(target.target)}</strong>. Peso: <strong>{target.weight}</strong>.</p>
          {phase.id === 5 && <p>Custo até a origem da conexão: <strong>{state.distances[state.currentId]}</strong>. Calcule {state.distances[state.currentId]} + {target.weight}.</p>}
          <p>Custo conhecido de {label(target.target)}: <strong>{formatCost(state.distances[target.target])}</strong>.</p>
          <label className="learning-panel__field" htmlFor={`${formId}-value`}>Custo para chegar por {label(state.currentId)}
            <input id={`${formId}-value`} type="number" min="0" step="1" inputMode="numeric" required value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
          <label className="learning-panel__field" htmlFor={`${formId}-choice`}>O que fazer com o custo conhecido?
            <select id={`${formId}-choice`} required value={choice} onChange={(event) => setChoice(event.target.value)}>
              <option value="">Escolha</option><option value="update">Atualizar custo e antecessor</option><option value="keep">Manter custo e antecessor</option>
            </select>
          </label>
          <button type="submit" className="learning-panel__primary">Conferir atualização</button>
        </>}
        {state.stage === 'confirm' && <>
          <p>Todos os vizinhos pendentes foram analisados. Com pesos positivos, o custo deste vértice está confirmado e não será revisado.</p>
          <button type="button" className="learning-panel__primary" onClick={() => perform({ type: 'confirm' })}>Confirmar e escolher o próximo</button>
        </>}
        {state.stage === 'reconstruct' && <>
          <p>Partindo do tesouro, siga os antecessores até a origem. Escolha o próximo na tabela.</p>
          <p className="learning-panel__trace">{state.route.map(label).join(' ← ')}</p>
        </>}
        {finishedRoute && <>
          <RouteView graph={graph} route={{ path: [...state.route].reverse(), weights: getRouteWeights(graph, [...state.route].reverse(), phase.directed) }} title="Caminho reconstruído" onHighlightPath={onHighlightPath} />
          <label className="learning-panel__field" htmlFor={`${formId}-value`}>Custo mínimo até o tesouro
            <input id={`${formId}-value`} type="number" min="0" step="1" inputMode="numeric" required value={value} onChange={(event) => setValue(event.target.value)} />
          </label>
          <button type="submit" className="learning-panel__primary" disabled={state.stage === 'complete'}>Conferir e iniciar corrida</button>
        </>}
      </form>
      {state.stage !== 'initialize' && <>
        <p className="learning-panel__legend">∞: ainda sem caminho conhecido. <strong>Provisório</strong>: pode melhorar. <strong>Confirmado</strong>: menor custo definitivo.</p>
        <div className="learning-panel__table-wrap">
          <table className="learning-panel__table">
            <caption>Custos a partir de {label(startId)}</caption>
            <thead><tr><th scope="col">Vértice</th><th scope="col">Custo</th><th scope="col">Antecessor</th><th scope="col">Estado</th></tr></thead>
            <tbody>{graph.nodes.map((node) => {
              const settled = state.settled.includes(node.id);
              const active = node.id === state.currentId;
              const canChoose = (state.stage === 'choose' && !settled) || state.stage === 'reconstruct';
              return <tr key={node.id} className={active ? 'learning-panel__row--active' : undefined}>
                <th scope="row">{canChoose
                  ? <button type="button" onClick={() => perform({ type: state.stage === 'choose' ? 'choose' : 'predecessor', nodeId: node.id })}
                    onFocus={() => onFocusNode?.(node.id)} aria-label={`${state.stage === 'choose' ? 'Processar' : 'Escolher antecessor'} ${node.label}, custo ${formatCost(state.distances[node.id])}`}>{node.label}</button>
                  : node.label}</th>
                <td>{formatCost(state.distances[node.id])}</td>
                <td>{state.previous[node.id] ? label(state.previous[node.id]) : '—'}</td>
                <td>{settled ? 'Confirmado' : active ? 'Em análise' : Number.isFinite(state.distances[node.id]) ? 'Provisório' : 'Desconhecido'}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </>}
    </div>
  );
}

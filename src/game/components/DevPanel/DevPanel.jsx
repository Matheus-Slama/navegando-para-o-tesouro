import './DevPanel.css';

const BOAT_LABELS = {
  red: 'Barco Vermelho',
  blue: 'Barco Azul',
  green: 'Barco Verde',
  black: 'Barco Preto'
};

export function DevPanel({
  open,
  graph,
  phase,
  phaseIndex,
  phases,
  onToggle,
  onSelectPhase,
  onRegenerateMap,
  routeStyle,
  onChangeRouteStyle
}) {
  const islandCount = graph.nodes.filter((node) => node.type === 'intermediate').length;
  const winner = graph.nodes.find((node) => node.id === graph.results.winner.startId);

  return (
    <aside className={`dev-panel${open ? ' is-open' : ''}`} aria-label="Ferramentas de desenvolvimento">
      <button
        className="dev-panel__toggle"
        type="button"
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? 'Fechar dev' : 'Modo dev'}
      </button>

      {open && (
        <div className="dev-panel__content">
          <strong>Dados do mapa</strong>
          <label className="dev-panel__phase">
            <span>Selecionar fase</span>
            <select value={phaseIndex} onChange={(event) => onSelectPhase(Number(event.target.value))}>
              {phases.map((availablePhase, index) => (
                <option key={availablePhase.id} value={index}>
                  {availablePhase.id}. {availablePhase.name} — {availablePhase.difficulty}
                </option>
              ))}
            </select>
          </label>
          <label className="dev-panel__phase">
            <span>Estilo das ligações</span>
            <select value={routeStyle} onChange={(event) => onChangeRouteStyle(event.target.value)}>
              <option value="chevrons">Chevrons</option>
              <option value="arrows-white">Linha branca com setas</option>
              <option value="arrows-black">Linha preta com setas</option>
            </select>
          </label>
          <dl>
            <div><dt>Nível</dt><dd>{phase.difficulty}</dd></div>
            <div><dt>Ilhas</dt><dd>{islandCount}</dd></div>
            <div><dt>Arestas</dt><dd>{graph.edges.length}</dd></div>
            <div><dt>Vencedor</dt><dd>{BOAT_LABELS[winner?.boat] ?? graph.results.winner.startId}</dd></div>
            <div><dt>Custo</dt><dd>{graph.results.winner.distance}</dd></div>
            <div><dt>Seed</dt><dd>{graph.seed}</dd></div>
          </dl>
          <button className="dev-panel__regenerate" type="button" onClick={onRegenerateMap}>
            Regenerar mapa
          </button>
        </div>
      )}
    </aside>
  );
}

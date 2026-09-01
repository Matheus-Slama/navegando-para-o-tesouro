import './RaceResult.css';

const BOAT_COLORS = {
  red: 'vermelho',
  blue: 'azul',
  green: 'verde',
  black: 'preto'
};

export function RaceResult({ result, selectedBoat, winner, isFinalPhase, onContinue }) {
  if (!result) return null;

  const selectedBoatName = `barco ${BOAT_COLORS[selectedBoat.boat]}`;
  const winnerBoatName = `barco ${BOAT_COLORS[winner.boat]}`;

  return (
    <section className={`race-result race-result--${result}`} role="dialog" aria-modal="true" aria-labelledby="race-result-title">
      <div className="race-result__card">
        <span className="race-result__icon" aria-hidden="true">{result === 'victory' ? '🏆' : '🧭'}</span>
        <h2 id="race-result-title">{result === 'victory' ? 'Você encontrou o melhor caminho!' : 'Esse não era o menor caminho'}</h2>
        <p>
          {result === 'victory'
            ? `O ${selectedBoatName} chegou primeiro ao tesouro.`
            : `O ${winnerBoatName} chegou ao tesouro antes do ${selectedBoatName}.`}
        </p>
        <button type="button" onClick={onContinue}>
          {result === 'victory' && !isFinalPhase ? 'Próxima fase' : result === 'victory' ? 'Jogar novamente' : 'Tentar novamente'}
        </button>
      </div>
    </section>
  );
}

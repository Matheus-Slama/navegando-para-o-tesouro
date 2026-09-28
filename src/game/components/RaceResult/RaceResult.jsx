import { BOAT_COLORS } from '@/game/enums/boat-colors';
import './RaceResult.css';

export function RaceResult({ result, selectedBoat, winner, isFinalPhase, onContinue }) {
  if (!result) return null;

  const selectedBoatName = `barco ${BOAT_COLORS[selectedBoat.boat]}`;
  const winnerBoatName = `barco ${BOAT_COLORS[winner.boat]}`;

  return (
    <section className={`race-result race-result--${result}`} role="dialog" aria-modal="true" aria-labelledby="race-result-title">
      <div className="race-result__card">
        <h2 id="race-result-title">
          {result === 'victory'
            ? isFinalPhase ? 'Você venceu!' : 'Você encontrou o melhor caminho!'
            : 'Esse não era o menor caminho'}
        </h2>
        <p>
          {result === 'victory'
            ? isFinalPhase
              ? 'O verdadeiro tesouro é aprender o conceito de melhor caminho em grafos.'
              : 'Siga para a próxima fase.'
            : `O ${winnerBoatName} chegou ao tesouro antes do ${selectedBoatName}.`}
        </p>
        <button type="button" onClick={onContinue}>
          {result === 'victory' && !isFinalPhase ? 'Próxima fase' : result === 'victory' ? 'Jogar novamente' : 'Tentar novamente'}
        </button>
      </div>
    </section>
  );
}

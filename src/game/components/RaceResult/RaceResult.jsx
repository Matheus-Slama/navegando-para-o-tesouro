import { BOAT_COLORS } from '@/game/enums/boat-colors';
import './RaceResult.css';

export function RaceResult({ result, winner, isFinalPhase, onContinue, lives, score, highscore }) {
  if (!result) return null;

  const winnerBoatName = `barco ${BOAT_COLORS[winner.boat]}`;

  return (
    <section className={`race-result race-result--${result}`} role="dialog" aria-modal="true" aria-labelledby="race-result-title">
      <div className="race-result__card">
        <h2 id="race-result-title">
          {lives === 0 ? 'Fim da jornada' : result === 'victory'
            ? isFinalPhase ? 'Você venceu!' : 'Você encontrou o melhor caminho!'
            : 'Esse não era o menor caminho'}
        </h2>
        <p>
          {result === 'victory'
            ? isFinalPhase
              ? 'O verdadeiro tesouro é aprender o conceito de melhor caminho em grafos.'
              : 'Siga para a próxima fase.'
            : `O ${winnerBoatName} foi o vencedor.`}
        </p>
        {lives === 0 && (
          <p>Pontuação final: {score.toLocaleString('pt-BR')}<br />
            High Score: {highscore.toLocaleString('pt-BR')}</p>
        )}
        <button type="button" onClick={onContinue}>
          {lives === 0 ? 'Voltar ao menu' : result === 'victory' && !isFinalPhase ? 'Próxima fase' : result === 'victory' ? 'Jogar novamente' : 'Tentar novamente'}
        </button>
      </div>
    </section>
  );
}

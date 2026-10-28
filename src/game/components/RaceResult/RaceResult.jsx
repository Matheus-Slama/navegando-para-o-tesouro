import { formatScore } from '@/game/core/text';
import { BOAT_COLORS } from '@/game/enums/boat-colors';
import './RaceResult.css';
import { VictoryTreasure } from '@/game/components/VictoryTreasure/VictoryTreasure';

export function RaceResult({ result, winner, isFinalPhase, onContinue, onBackToMenu, lives, score, highscore, lostPoints = 0 }) {
  if (!result) return null;
  if (result === 'victory' && isFinalPhase) {
    return <VictoryTreasure onContinue={onContinue} onBackToMenu={onBackToMenu} score={score} highscore={highscore} />;
  }

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
              ? 'O verdadeiro tesouro é o que você aprendeu nesta jornada! Entre ilhas e rotas, você explorou grafos, conectou vértices por arestas e comparou custos para encontrar o caminho de menor custo até o tesouro.'
              : 'Siga para a próxima fase.'
            : `O ${winnerBoatName} foi o vencedor.`}
        </p>
        {result === 'defeat' && <p>Você perdeu <strong>{formatScore(lostPoints)} pontos</strong>.</p>}
        {lives === 0 && (
          <p>Pontuação final: {formatScore(score)}<br />
            High Score: {formatScore(highscore)}</p>
        )}
        <button type="button" onClick={onContinue}>
          {lives === 0 ? 'Voltar ao menu' : result === 'victory' && !isFinalPhase ? 'Próxima fase' : result === 'victory' ? 'Jogar novamente' : 'Tentar novamente'}
        </button>
      </div>
    </section>
  );
}

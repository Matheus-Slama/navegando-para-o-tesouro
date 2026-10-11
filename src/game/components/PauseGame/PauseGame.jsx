import { formatScore } from '@/game/core/text';
import { GameDialog } from '@/game/components/GameDialog/GameDialog';
import '@/game/components/RaceResult/RaceResult.css';
import './PauseGame.css';

export function PauseGame({ onResume, onBackToMenu, score, highscore }) {
  return (
    <GameDialog labelledBy="pause-game-title" className="pause-game race-result">
      <div className="race-result__card">
        <h2 id="pause-game-title">Pause Game</h2>
        <p>Pontuação atual: <strong>{formatScore(score)}</strong><br />
          High Score: <strong>{formatScore(highscore)}</strong></p>
        <div className="pause-game__actions">
          <button type="button" onClick={onResume}>Voltar pro jogo</button>
          <button type="button" onClick={onBackToMenu}>Voltar ao menu</button>
        </div>
      </div>
    </GameDialog>
  );
}

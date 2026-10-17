import { formatScore } from '@/game/core/text';
import { GameModal } from '@/game/components/GameDialog/GameModal';
import { useDeviceConfig } from '@/game/hooks/useDeviceConfig';
import './PauseGame.css';

const ACTION_COLUMNS_BY_DEVICE = {
  mobile: 1,
  wideCompact: 1,
  tablet: 2,
  wide: 2
};

export function PauseGame({ onResume, onBackToMenu, score, highscore }) {
  const device = useDeviceConfig();

  return (
    <GameModal labelledBy="pause-game-title" className="pause-game">
        <h2 id="pause-game-title">Pause Game</h2>
        <p>Pontuação atual: <strong>{formatScore(score)}</strong><br />
          High Score: <strong>{formatScore(highscore)}</strong></p>
        <div className="pause-game__actions" style={{ '--pause-action-columns': ACTION_COLUMNS_BY_DEVICE[device.id] }}>
          <button type="button" onClick={onResume}>Voltar pro jogo</button>
          <button type="button" onClick={onBackToMenu}>Voltar ao menu</button>
        </div>
    </GameModal>
  );
}

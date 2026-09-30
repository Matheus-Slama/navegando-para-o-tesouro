import { Coins, Trophy, Hourglass, Heart } from 'lucide-react';
import './GameHud.css';

export function GameHud({ score, highscore, elapsed, lives, phase, storageAvailable }) {
  const seconds = Math.floor(elapsed);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <aside className="game-hud" aria-label="Status da jornada">
      <div className="game-hud__stat"><Coins aria-hidden="true" /><span>Pontos<strong>{score.toLocaleString('pt-BR')}</strong></span></div>
      <div className="game-hud__stat" title={storageAvailable ? 'Recorde salvo neste navegador' : 'Armazenamento indisponível: recorde apenas nesta sessão'}><Trophy aria-hidden="true" /><span>Recorde{!storageAvailable && ' *'}<strong>{highscore.toLocaleString('pt-BR')}</strong></span></div>
      <div className="game-hud__stat"><Hourglass aria-hidden="true" /><span>Fase {phase}<strong aria-label={`Tempo da fase: ${time}`}>{time}</strong></span></div>
      <div className="game-hud__lives" role="status" aria-label={`${lives} de 3 vidas`}>
        <span>Vidas</span>
        <div>{[1, 2, 3].map((life) => <Heart key={life} aria-hidden="true" data-lost={life > lives} />)}</div>
      </div>
    </aside>
  );
}

import { formatScore, formatElapsedTime } from '@/game/core/text';
import Image from 'next/image';
import './GameHud.css';

export function GameHud({ lives, elapsed = 0, score = 0 }) {
  const time = formatElapsedTime(elapsed);
  const formattedScore = formatScore(score);
  const scoreFontScale = Math.min(1, 5 / formattedScore.length);

  return (
    <div className="game-hud">
      <Image
        className="game-hud__panel"
        src="/assets/game/ui/panel-hud.webp"
        alt="Painel de vida, pontos e tempo"
        width={2172}
        height={724}
        unoptimized
        loading="eager"
        draggable={false}
      />
      <span className="game-hud__lives" role="status" aria-label={`${lives} ${lives === 1 ? 'vida restante' : 'vidas restantes'}`}>
        {lives > 0 && (
          <Image
            src={`/assets/game/ui/indicator-lives-${lives}.webp`}
            alt=""
            width={2172}
            height={724}
            unoptimized
            loading="eager"
            draggable={false}
          />
        )}
      </span>
      <span className="game-hud__score" style={{ '--score-font-scale': scoreFontScale }} data-negative={score < 0} role="status" aria-label={`Pontuação: ${score} pontos`}>
        {formattedScore}
      </span>
      <span className="game-hud__time" role="timer" aria-label={`Tempo da fase: ${time}`}>
        {time}
      </span>
    </div>
  );
}

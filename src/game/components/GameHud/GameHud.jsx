import Image from 'next/image';
import './GameHud.css';

export function GameHud({ lives, elapsed = 0, score = 0 }) {
  const totalSeconds = Math.max(0, Math.floor(elapsed));
  const time = `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="game-hud">
      <Image
        className="game-hud__panel"
        src="/assets/game/ui/wooden-hud-empty.png"
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
            src={`/assets/game/ui/lives-${lives}.png`}
            alt=""
            width={2172}
            height={724}
            unoptimized
            loading="eager"
            draggable={false}
          />
        )}
      </span>
      <span className="game-hud__score" role="status" aria-label={`Pontuação: ${score} pontos`}>
        {score.toLocaleString('pt-BR')}
      </span>
      <span className="game-hud__time" role="timer" aria-label={`Tempo da fase: ${time}`}>
        {time}
      </span>
    </div>
  );
}

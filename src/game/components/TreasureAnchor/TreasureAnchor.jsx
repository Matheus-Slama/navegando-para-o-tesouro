import Image from 'next/image';
import { GAME_ASSETS } from '@/game/config/gameAssets';
import './TreasureAnchor.css';

const TREASURE_LEVELS = ['small', 'medium', 'large', 'legendary'];

export function TreasureAnchor({ node, phaseIndex, totalPhases }) {
  const level = TREASURE_LEVELS[Math.min(phaseIndex, TREASURE_LEVELS.length - 1)];
  const isFinalPhase = phaseIndex === totalPhases - 1;

  return (
    <div
      className={`treasure-anchor treasure-anchor--${level}${isFinalPhase ? ' treasure-anchor--final' : ''}`}
      data-graph-node-id={node.id}
      data-graph-node-type="finish"
      role="img"
      aria-label={`${node.label}: destino final da fase ${phaseIndex + 1}`}
    >
      <Image
        src={GAME_ASSETS.treasures[level]}
        alt=""
        width={1254}
        height={1254}
        sizes="(max-width: 37.5rem) 30vw, 16vw"
        priority
      />
    </div>
  );
}

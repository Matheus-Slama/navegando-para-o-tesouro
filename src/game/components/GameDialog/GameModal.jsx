import { GameDialog } from './GameDialog';
import '@/game/components/RaceResult/RaceResult.css';
import './GameModal.css';

export function GameModal({ children, className = '', ...props }) {
  return (
    <GameDialog {...props} className={`game-modal race-result ${className}`}>
      <div className="race-result__card">{children}</div>
    </GameDialog>
  );
}

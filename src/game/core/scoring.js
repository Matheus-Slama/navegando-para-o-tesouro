import { getPhaseBalance } from '../config/balance.js';

export function calculateScore(phase, elapsedSeconds) {
  return getPhaseBalance(phase.id, elapsedSeconds).score;
}

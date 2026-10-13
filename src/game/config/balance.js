/**
 * Regras de pontuação da jornada.
 *
 * Uma escolha correta concede (ID da fase × 1000) / tempo de escolha,
 * com o tempo expresso em segundos, incluindo frações de segundo.
 * O resultado é arredondado para um inteiro e não possui limite máximo:
 * quanto menor o tempo, maior a recompensa. Na fase 2, por exemplo,
 * uma escolha em 5 segundos concede 400 pontos.
 *
 * Tempos iguais a zero, negativos ou não finitos resultam em zero pontos.
 * Uma escolha incorreta desconta WRONG_BOAT_PENALTY / tempo de escolha:
 * quanto mais rápida a escolha errada, maior a perda de pontos. O total
 * que pode ficar negativo e é exibido em vermelho no HUD.
 */
export const WRONG_BOAT_PENALTY = 250;

/**
 * @param {number} id ID inteiro positivo da fase.
 * @param {number} timeSeconds Tempo gasto para escolher o barco, em segundos.
 * @returns {{ score: number }} Pontos concedidos pela escolha correta.
 */
export function getPhaseBalance(id, timeSeconds) {
  if (!Number.isInteger(id) || id < 1) throw new Error(`ID de fase inválido: ${id}.`);
  const score = Number.isFinite(timeSeconds) && timeSeconds > 0
    ? Math.round((id * 1000) / timeSeconds)
    : 0;
  return { score };
}

/**
 * @param {number} timeSeconds Tempo gasto para escolher o barco, em segundos.
 * @returns {number} Pontos descontados por uma escolha incorreta.
 */
export function getWrongBoatPenalty(timeSeconds) {
  return Number.isFinite(timeSeconds) && timeSeconds > 0
    ? Math.round(WRONG_BOAT_PENALTY / timeSeconds)
    : 0;
}

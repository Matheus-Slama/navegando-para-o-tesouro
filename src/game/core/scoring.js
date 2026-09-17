export const RECORDS_KEY = 'navegando-para-o-tesouro:records:v1';

export function calculateScore(phase, elapsedSeconds) {
  const { maxScore, targetTimeSeconds } = phase.score;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0 || targetTimeSeconds <= 0) return 0;
  return Math.round(maxScore * targetTimeSeconds / Math.max(elapsedSeconds, targetTimeSeconds));
}

export function readRecords(storage) {
  try {
    const value = JSON.parse(storage?.getItem(RECORDS_KEY) ?? '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).filter(([, entry]) =>
      entry && Number.isFinite(entry.score) && entry.score >= 0 &&
      Number.isFinite(entry.elapsedSeconds) && entry.elapsedSeconds >= 0
    ));
  } catch {
    return {};
  }
}

export function saveRecord(storage, phaseId, result) {
  const records = readRecords(storage);
  const previous = records[phaseId];
  const best = !previous || result.score > previous.score ||
    (result.score === previous.score && result.elapsedSeconds < previous.elapsedSeconds)
    ? { score: result.score, elapsedSeconds: result.elapsedSeconds } : previous;
  records[phaseId] = best;
  let persisted = false;
  try {
    if (storage) {
      storage.setItem(RECORDS_KEY, JSON.stringify(records));
      persisted = true;
    }
  } catch {
    // O jogo continua disponível quando o navegador impede armazenamento.
  }
  return { best, persisted };
}

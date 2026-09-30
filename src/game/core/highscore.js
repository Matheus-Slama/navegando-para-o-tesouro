// Proteção contra edição casual, não contra trapaça: código e chave vivem no cliente.
// AES-GCM autentica o conteúdo e rejeita registros adulterados sem uma nova assinatura.
export const HIGHSCORE_KEY = 'navegando:highscore:v2';
const KEY = 'navegando:highscore-key:v2';
const encode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function getKey(storage, crypto) {
  let raw = storage.getItem(KEY);
  if (!raw) {
    raw = encode(crypto.getRandomValues(new Uint8Array(32)));
    storage.setItem(KEY, raw);
  }
  return crypto.subtle.importKey('raw', decode(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function readHighscore(storage, crypto = globalThis.crypto) {
  try {
    const record = JSON.parse(storage.getItem(HIGHSCORE_KEY));
    if (!record) return 0;
    const key = await getKey(storage, crypto);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(record.iv) }, key, decode(record.data));
    const score = JSON.parse(new TextDecoder().decode(plain));
    return Number.isSafeInteger(score) && score >= 0 ? score : 0;
  } catch {
    return 0;
  }
}

export async function saveHighscore(storage, score, crypto = globalThis.crypto) {
  try {
    if (!Number.isSafeInteger(score) || score < 0) return false;
    const best = Math.max(score, await readHighscore(storage, crypto));
    const key = await getKey(storage, crypto);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(best)));
    storage.setItem(HIGHSCORE_KEY, JSON.stringify({ iv: encode(iv), data: encode(data) }));
    return true;
  } catch {
    return false;
  }
}

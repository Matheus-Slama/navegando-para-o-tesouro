export function createRandomSeed(previousSeed = null) {
  const maximum = 2147483646;
  const sample = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
    : Math.random();
  const seed = Math.floor(sample * maximum) + 1;
  return seed === previousSeed ? (seed % maximum) + 1 : seed;
}

export function createSeededRandom(seed) {
  let value = seed % 2147483647;

  if (value <= 0) {
    value += 2147483646;
  }

  return function random() {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function shuffle(random, list) {
  const copy = [...list];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(random() * (index + 1));
    [copy[index], copy[selected]] = [copy[selected], copy[index]];
  }

  return copy;
}

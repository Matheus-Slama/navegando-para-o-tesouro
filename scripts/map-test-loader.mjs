import { readFileSync } from 'node:fs';

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const path = specifier.slice(2);
    return { url: new URL(`../src/${path}${path.endsWith('.json') ? '' : '.js'}`, import.meta.url).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url.includes('/src/') && url.endsWith('.json')) {
    return { format: 'module', source: `export default ${readFileSync(new URL(url), 'utf8')}`, shortCircuit: true };
  }
  if (url.includes('/src/') && url.endsWith('.js')) {
    return { format: 'module', source: readFileSync(new URL(url), 'utf8'), shortCircuit: true };
  }
  return nextLoad(url, context);
}

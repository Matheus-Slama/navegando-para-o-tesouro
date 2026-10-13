import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

// Next prefixes routes and its own bundles, but public URLs also need the prefix.
const basePath = process.env.PAGES_BASE_PATH || '';
if (basePath && !/^\/[A-Za-z0-9._-]+$/.test(basePath)) {
  throw new Error('PAGES_BASE_PATH must be empty or a single /repository path.');
}

async function prepare(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await prepare(path);
    } else if (basePath && ['.html', '.css', '.js', '.json', '.txt'].includes(extname(path))) {
      const content = await readFile(path, 'utf8');
      // Include the RSC payloads used by client navigation. Do not prefix twice.
      const updated = content.replace(/(?<![A-Za-z0-9_./-])\/(assets|fonts|licenses)\//g, `${basePath}/$1/`);
      if (updated !== content) await writeFile(path, updated);
    }
  }
}

await prepare('out');
await writeFile('out/.nojekyll', '');
console.log(`GitHub Pages export prepared for ${basePath || '/'}`);

// Generates a font face used only for U+0030: the numeric zero keeps its
// meaning in the DOM but displays Pirata One's uppercase O glyph.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const upstream = 'https://raw.githubusercontent.com/google/fonts/main/ofl/pirataone/';
async function download(name) {
  const response = await fetch(upstream + name);
  if (!response.ok) throw new Error(`Font download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const source = await download('PirataOne-Regular.ttf');
const tables = new Map();
for (let i = 0; i < source.readUInt16BE(4); i++) {
  const record = 12 + i * 16;
  const offset = source.readUInt32BE(record + 8);
  tables.set(source.toString('ascii', record, record + 4),
    Buffer.from(source.subarray(offset, offset + source.readUInt32BE(record + 12))));
}
const originalCmap = tables.get('cmap');
let glyph;
for (let i = 0; i < originalCmap.readUInt16BE(2); i++) {
  const record = 4 + i * 8;
  if (originalCmap.readUInt16BE(record) !== 3 || originalCmap.readUInt16BE(record + 2) !== 1) continue;
  const cmap = originalCmap.subarray(originalCmap.readUInt32BE(record + 4));
  assert.equal(cmap.readUInt16BE(0), 4);
  const count = cmap.readUInt16BE(6) / 2;
  for (let j = 0; j < count; j++) {
    if (cmap.readUInt16BE(14 + j * 2) < 79 || cmap.readUInt16BE(16 + count * 2 + j * 2) > 79) continue;
    const delta = cmap.readInt16BE(16 + count * 4 + j * 2);
    const address = 16 + count * 6 + j * 2;
    const range = cmap.readUInt16BE(address);
    const start = cmap.readUInt16BE(16 + count * 2 + j * 2);
    glyph = range ? cmap.readUInt16BE(address + range + (79 - start) * 2) : 79;
    glyph = (glyph + delta) & 0xffff;
    break;
  }
}
assert.ok(glyph > 0, 'Uppercase O must exist in the source font.');
// A format-4 cmap with just zero and the required sentinel segment.
const cmap = Buffer.alloc(44);
cmap.writeUInt16BE(1, 2);
cmap.writeUInt16BE(3, 4);
cmap.writeUInt16BE(1, 6);
cmap.writeUInt32BE(12, 8);
[4, 32, 0, 4, 4, 1, 0, 48, 65535, 0, 48, 65535, (glyph - 48) & 65535, 1, 0, 0]
  .forEach((value, i) => cmap.writeUInt16BE(value, 12 + i * 2));
tables.set('cmap', cmap);
// Give this modified font its own name; preserve the upstream license separately.
const names = [[1, 'Treasure Zero'], [2, 'Regular'], [3, 'TreasureZero-Regular-1'],
  [4, 'Treasure Zero Regular'], [5, 'Version 1.0'], [6, 'TreasureZero-Regular']];
const strings = names.map(([, value]) => Buffer.from(value, 'utf16le').swap16());
const name = Buffer.alloc(6 + names.length * 12 + strings.reduce((sum, s) => sum + s.length, 0));
name.writeUInt16BE(names.length, 2);
name.writeUInt16BE(6 + names.length * 12, 4);
let stringOffset = 0;
names.forEach(([id], i) => {
  [3, 1, 0x409, id, strings[i].length, stringOffset].forEach((v, j) => name.writeUInt16BE(v, 6 + i * 12 + j * 2));
  strings[i].copy(name, 6 + names.length * 12 + stringOffset);
  stringOffset += strings[i].length;
});
tables.set('name', name);
tables.delete('DSIG');
tables.get('head').writeUInt32BE(0, 8);
function checksum(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) sum = (sum + data.readUInt32BE(i)) >>> 0;
  return sum;
}
const entries = [...tables].sort(([a], [b]) => a.localeCompare(b));
const output = Buffer.alloc(12 + entries.length * 16 + entries.reduce((sum, [, data]) => sum + Math.ceil(data.length / 4) * 4, 0));
output.writeUInt32BE(0x10000, 0);
output.writeUInt16BE(entries.length, 4);
const power = Math.floor(Math.log2(entries.length));
output.writeUInt16BE(2 ** power * 16, 6);
output.writeUInt16BE(power, 8);
output.writeUInt16BE(entries.length * 16 - 2 ** power * 16, 10);
let offset = 12 + entries.length * 16;
let headOffset;
entries.forEach(([tag, data], i) => {
  const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4);
  data.copy(padded);
  const record = 12 + i * 16;
  output.write(tag, record, 4, 'ascii');
  output.writeUInt32BE(checksum(padded), record + 4);
  output.writeUInt32BE(offset, record + 8);
  output.writeUInt32BE(data.length, record + 12);
  padded.copy(output, offset);
  if (tag === 'head') headOffset = offset;
  offset += padded.length;
});
output.writeUInt32BE((0xb1b0afba - checksum(output)) >>> 0, headOffset + 8);
assert.equal(checksum(output), 0xb1b0afba);
await mkdir('public/fonts', { recursive: true });
await mkdir('public/licenses', { recursive: true });
await writeFile('public/fonts/font-treasure-zero.ttf', output);
await writeFile('public/licenses/Pirata-One-OFL.txt', await download('OFL.txt'));
console.log('Generated Treasure Zero: U+0030 uses the uppercase O glyph.');

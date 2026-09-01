import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const quickCovers = [
  'gochujang-honey-soy-chicken-rice.webp',
  'bulgogi-bavette-udon.webp',
  'maple-mustard-soy-pork-tenderloin.webp',
  'miso-honey-salmon-soba.webp'
];

const previouslyReused = [
  ['gochujang-honey-soy-chicken-rice.webp', 'glazed-chicken-skewers-rice.webp'],
  ['bulgogi-bavette-udon.webp', 'reverse-sear-beef-potatoes-pepper-sauce.webp'],
  ['miso-honey-salmon-soba.webp', 'honey-soy-salmon-rice-asparagus.webp']
];

async function cover(name) {
  return readFile(new URL(`../assets/recipes/${name}`, import.meta.url));
}

test('quick overnight meals use four dedicated WebP renders', async () => {
  const images = await Promise.all(quickCovers.map(cover));
  const signatures = images.map(bytes => `${bytes.length}:${bytes.toString('base64', 0, 32)}`);

  for (const bytes of images) {
    assert.ok(bytes.length > 5000, 'Dedicated cover should contain a real compressed food render.');
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
  }

  assert.equal(new Set(signatures).size, quickCovers.length, 'Every quick meal should have its own render.');
});

for (const [quickName, oldName] of previouslyReused) {
  test(`${quickName} is no longer a reused cover`, async () => {
    const [quick, old] = await Promise.all([cover(quickName), cover(oldName)]);
    assert.equal(quick.equals(old), false);
  });
}

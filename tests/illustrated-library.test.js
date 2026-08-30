import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('every executable recipe has a local non-empty WebP cover', async () => {
  for (const entry of library.recipes.filter(item => item.status === 'available')) {
    const imageUrl = entry.visual.imageUrl;
    assert.match(imageUrl, /^\.\/assets\/recipes\/.+\.webp$/);
    const assetUrl = new URL(`../${imageUrl.replace(/^\.\//, '')}`, import.meta.url);
    const bytes = await readFile(assetUrl);
    assert.ok(bytes.length > 5000, `Cover ${imageUrl} should contain a real food image.`);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
  }
});

test('library and detail UI render image covers with fallback semantics', () => {
  assert.match(app, /recipe-card-image/);
  assert.match(app, /entry\.visual\?\.imageUrl/);
  assert.match(app, /recipeHeroImage/);
  assert.match(indexHtml, /id="recipeHeroImage"/);
  assert.match(styles, /\.recipe-card-image/);
  assert.match(styles, /\.recipe-hero-image/);
  assert.match(styles, /\.has-image/);
});

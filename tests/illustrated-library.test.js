import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('every executable recipe cover exists and is responsive SVG artwork', async () => {
  for (const entry of library.recipes.filter(item => item.status === 'available')) {
    const imageUrl = entry.visual.imageUrl;
    const assetUrl = new URL(`../${imageUrl.replace(/^\.\//, '')}`, import.meta.url);
    const svg = await readFile(assetUrl, 'utf8');
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox="0 0 1200 675"/);
    assert.doesNotMatch(svg, /<text\b/i, `Cover ${imageUrl} should not bake UI text into artwork.`);
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

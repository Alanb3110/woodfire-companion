import test from 'node:test';
import assert from 'node:assert/strict';
import {
  installRecipeHeroImageBridge,
  recipeHeroBackgroundImage
} from '../js/recipe-hero.js';

class FakeObserver {
  static latest = null;
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    FakeObserver.latest = this;
  }
  observe(target, options) {
    this.target = target;
    this.options = options;
  }
  trigger() { this.callback(); }
  disconnect() { this.disconnected = true; }
}

function fakeDom() {
  const hero = { style: {} };
  const image = {
    hidden: true,
    style: {},
    dataset: {},
    attributes: new Map([['src', '']]),
    getAttribute(name) { return this.attributes.get(name) ?? null; }
  };
  const documentRef = {
    getElementById(id) {
      if (id === 'recipeHero') return hero;
      if (id === 'recipeHeroImage') return image;
      return null;
    }
  };
  return { hero, image, documentRef };
}

test('hero background helper only accepts visible local recipe assets', () => {
  const image = {
    hidden: false,
    getAttribute: () => './assets/recipes/example.webp'
  };
  assert.equal(recipeHeroBackgroundImage(image), 'url("./assets/recipes/example.webp")');
  image.hidden = true;
  assert.equal(recipeHeroBackgroundImage(image), '');
  image.hidden = false;
  image.getAttribute = () => 'https://example.com/image.webp';
  assert.equal(recipeHeroBackgroundImage(image), '');
});

test('iOS-safe hero bridge keeps the img unpainted and mirrors src to the hero background', () => {
  const { hero, image, documentRef } = fakeDom();
  const cleanup = installRecipeHeroImageBridge({ documentRef, MutationObserverRef: FakeObserver });

  assert.equal(image.style.display, 'none');
  assert.equal(image.style.pointerEvents, 'none');
  assert.equal(hero.style.backgroundImage, '');
  assert.deepEqual(FakeObserver.latest.options.attributeFilter, ['src', 'hidden']);

  image.hidden = false;
  image.attributes.set('src', './assets/recipes/pork.webp');
  FakeObserver.latest.trigger();

  assert.equal(hero.style.backgroundImage, 'url("./assets/recipes/pork.webp")');
  assert.equal(hero.style.backgroundSize, 'cover');
  assert.equal(hero.style.backgroundPosition, 'center');
  assert.equal(hero.style.backgroundRepeat, 'no-repeat');

  cleanup();
  assert.equal(FakeObserver.latest.disconnected, true);
});

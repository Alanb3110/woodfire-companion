function safeLocalImageUrl(value) {
  return typeof value === 'string' && value.startsWith('./') && !value.includes('"') && !value.includes("'")
    ? value
    : '';
}

export function recipeHeroBackgroundImage(imageElement) {
  if (!imageElement || imageElement.hidden) return '';
  const src = safeLocalImageUrl(imageElement.getAttribute?.('src') || '');
  return src ? `url("${src}")` : '';
}

export function installRecipeHeroImageBridge({
  documentRef = globalThis.document,
  MutationObserverRef = globalThis.MutationObserver
} = {}) {
  if (!documentRef) return () => {};

  const hero = documentRef.getElementById('recipeHero');
  const image = documentRef.getElementById('recipeHeroImage');
  if (!hero || !image) return () => {};
  if (image.dataset?.heroBridgeInstalled === 'true') return () => {};
  if (image.dataset) image.dataset.heroBridgeInstalled = 'true';

  const sync = () => {
    const backgroundImage = recipeHeroBackgroundImage(image);
    hero.style.backgroundImage = backgroundImage;
    hero.style.backgroundSize = backgroundImage ? 'cover' : '';
    hero.style.backgroundPosition = backgroundImage ? 'center' : '';
    hero.style.backgroundRepeat = backgroundImage ? 'no-repeat' : '';

    // The <img> remains as a stable DOM hook for app.js, but is never painted.
    // Using a CSS background avoids an extra absolutely-positioned compositing
    // layer that can interfere with iOS PWA rendering/touch handling.
    image.style.display = 'none';
    image.style.pointerEvents = 'none';
  };

  sync();

  let observer = null;
  if (typeof MutationObserverRef === 'function') {
    observer = new MutationObserverRef(sync);
    observer.observe(image, { attributes: true, attributeFilter: ['src', 'hidden'] });
  }

  return () => observer?.disconnect();
}

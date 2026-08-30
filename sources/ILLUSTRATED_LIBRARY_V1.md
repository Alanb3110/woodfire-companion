# Woodfire Companion — Illustrated Library V1

## Goal
The recipe library should feel like a cooking product rather than a text catalogue while remaining fully local-first and GitHub Pages compatible.

V1 adds one local illustrated cover to every executable recipe. Illustration metadata belongs to the library manifest because it is discovery/UI metadata, not cooking semantics.

## Manifest contract
Each `available` entry in `recipes/index.json` requires:

```json
"visual": {
  "theme": "...",
  "symbol": "...",
  "eyebrow": "...",
  "imageUrl": "./assets/recipes/example.svg"
}
```

`visual.imageUrl` must be a local relative asset URL. Runtime external image URLs are not allowed for executable recipes because offline availability is a product requirement.

`theme`, `symbol` and `eyebrow` remain useful fallback/decorative metadata. The image is the primary cover when present; the symbol remains the fallback if an image is absent in future non-executable/coming-soon content.

## Asset strategy
V1 uses local SVG covers:
- small repository/cache footprint;
- sharp rendering on iPhone Retina displays;
- no third-party host or CORS dependency;
- safe GitHub Pages subpath behavior through relative URLs;
- easy replacement later by another local format without changing planner/content semantics.

Current covers:
- `assets/recipes/pork-belly-burnt-ends.svg`;
- `assets/recipes/sweet-savory-turkey-zucchini-gratin.svg`;
- `assets/recipes/smoked-beef-barbacoa.svg`.

The assets intentionally contain no recipe title or UI text. Titles, status, timing and tags remain accessible HTML rather than baked into artwork.

## UI behavior
Library card:
- cover fills the existing artwork area using `object-fit: cover`;
- existing eyebrow remains over the image with a dark gradient for legibility;
- fallback theme/symbol still works if the cover is unavailable;
- mobile cards keep the current compact horizontal layout; desktop keeps the existing grid.

Recipe detail:
- the same local cover is reused as the large hero;
- the hero keeps its eyebrow overlay;
- the emoji/symbol is hidden when a real image is present and remains the fallback otherwise.

Images are decorative because the recipe title and description immediately follow them; `alt=""` prevents duplicate screen-reader content.

## Offline behavior
The service worker still discovers content through `recipes/index.json`.

For every `available` recipe it preloads both:
1. `recipeUrl`;
2. `visual.imageUrl` when present.

The PWA therefore keeps recipe covers available after installation/offline use without hard-coding individual recipe filenames in `service-worker.js`.

## Acceptance
CI should protect the following:
- every available recipe has a local `visual.imageUrl`;
- each declared cover exists in the repository;
- cover SVGs expose a `viewBox` for responsive rendering;
- service-worker preloading remains manifest-driven and includes `visual.imageUrl`;
- the app contains both library-card and detail-hero image paths while retaining fallbacks.

## Non-goals
V1 does not add:
- remote/CDN images;
- user-uploaded recipe imagery;
- per-step illustrations;
- image editing inside the app;
- runtime AI/image generation;
- a new recipe schema field.

Those should only be considered if a real product need appears.

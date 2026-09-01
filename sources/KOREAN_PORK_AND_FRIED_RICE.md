# Porc coréen effiloché + Egg Fried Rice

## Source and structure
This pair is based on the two recipe cards supplied on 2026-09-01.

The application keeps them as two separate executable recipes:
- `korean-pulled-pork` — long Woodfire pork cook;
- `egg-fried-rice` — generic quick stovetop fried rice.

The fried rice deliberately does **not** make bacon part of the recipe. The useful leftover option is the Korean pulled pork itself.

## Korean pulled pork
Source recipe pattern retained:
- pork shoulder/neck, roughly 1.5–2 kg at the source scale;
- 12–24 h Korean-style marinade with soy, gochujang, honey, brown sugar, garlic, ginger, sesame oil and rice vinegar;
- high-heat coloration;
- tightly covered slow cook around 120–130 °C with onion, retained marinade and 100–150 mL stock/water;
- target 94–95 °C **plus probe tenderness**;
- 30–45 min covered rest;
- shred and mix with cooking juices.

The source card also suggests an optional 30–45 min cold-smoke phase. V1 keeps that as explicit optional guidance outside the standard Woodfire planner because the normal Woodfire configuration is not treated as a true cold-smoke setup.

## Egg Fried Rice
The recipe is generic by default.

Base sauce:
- soy sauce;
- rice vinegar or lime;
- sesame oil;
- a small amount of water only if needed to loosen the sauce.

### Optional gochujang
The gochujang version is **the same recipe and same cooking method**. Add gochujang to the base sauce; no duplicate recipe is required.

### Optional Korean pulled pork
150–250 g at the 2-serving reference may be added near the end with a little cooking juice, just long enough to reheat it.

The two options are independent:
- classic fried rice;
- gochujang only;
- pulled pork only;
- gochujang + pulled pork.

## Qualification
Both recipes enter as `untested` in the app until real-cook feedback is captured. The supplied cards are the content baseline, not evidence that the planner timings have been qualified on the current PWA implementation.

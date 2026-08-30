# Woodfire Companion — Tacos Barbacoa Meal

## Status
Executable curated meal for Woodfire Companion. Recipe file: `recipes/smoked-beef-barbacoa.json`.

This meal promotes the previous family barbacoa plan into the shared Recipe Schema V1 / Planner V1 pipeline rather than adding recipe-specific UI or planner logic.

## Reference meal
- 8 people.
- 2.6 kg boneless beef shank, originally two pieces of about 1.3 kg.
- Hard taco shells for service.
- Smoked salsa plus a compact fresh-toppings buffet.
- No alcohol/flambé.
- Reference service time: 19:00.

The executable serving range is intentionally limited to 6–8 people so the declared two-piece / single-Woodfire execution structure remains credible without batch synthesis.

## Barbacoa flavor base
Reference marinade for 8:
- juice of 2 oranges;
- juice of 2 limes;
- 6 garlic cloves;
- 2 tbsp tomato paste;
- 2 tbsp cider vinegar;
- 1.5–2 tsp chipotle powder;
- 2 tsp ground cumin;
- 2 tsp dried oregano;
- 1 tbsp smoked paprika;
- 25–30 g salt;
- about 1 tsp black pepper.

Marinate ideally overnight, or at least 2 h before cooking.

Covered braise additions:
- 2 sliced yellow onions;
- all reserved marinade;
- 400–500 mL hot beef stock;
- 2 bay leaves.

## Woodfire sequence
### Smoked salsa vegetables
- mode: GRILL;
- setpoint: 200 °C (190–210 °C acceptable declared range);
- smoke: ON;
- pellets: yes;
- support: grill surface;
- uncovered;
- tomatoes, white onion and jalapeño directly on the grill;
- planned duration: 20 min.

This uses otherwise passive beef-tempering time and releases the Woodfire before the beef-smoking phase.

### Beef smoke
- mode: SMOKER;
- setpoint: 125 °C (125–130 °C declared range);
- smoke: ON;
- pellets: yes;
- support: grill surface;
- uncovered;
- two pieces directly on the grill;
- planned duration: 90 min.

Surface appearance, not internal temperature, ends this phase.

### Covered braise
- mode: BAKE/ROAST;
- setpoint: 140 °C (135–140 °C declared range);
- smoke: OFF;
- pellets: no;
- support: large deep Woodfire-compatible roasting dish;
- covered tightly with foil;
- planned duration: 420 min, declared range 300–420 min.

The 420 min planning value intentionally represents the conservative long-cook reference. Real completion is tenderness-driven.

## Completion logic
The first true doneness check is planned around 17:00 for a 19:00 service.

~93 °C core temperature is only a useful reference. The authoritative completion state is probe/fork tenderness across both pieces. If still firm, reseal and continue at 140 °C in 20–30 min increments.

After the meat is ready:
- rest beef 45 min;
- reduce braising juices on the stovetop for about 20 min in parallel;
- shred for about 20 min;
- add enough reduced juice back to keep the barbacoa very moist.

The plan keeps about 55 min of baseline margin between finished shredding and service. Rechecks may consume that margin before service time moves.

## Salsa and taco bar
Smoked salsa reference:
- 600 g tomatoes;
- 1 white onion;
- 1–2 jalapeños;
- juice of 1 lime;
- about 15 g coriander;
- about 4 g salt.

Taco bar for 8:
- 24 hard taco shells (~3/person);
- 300 g grated cheddar;
- 250 g shredded lettuce;
- 3 avocados;
- 1 red onion, very thinly sliced;
- about 15 g coriander;
- 400 g sour cream / thick crème fraîche;
- lime wedges;
- smoked salsa;
- barbacoa and reduced juices served separately from the shells.

## Reference timeline — service 19:00
- 07:45 — take beef out of refrigerator;
- 08:10 — smoke/grill salsa vegetables;
- 08:30 — start beef smoke; blend salsa in parallel;
- 10:00 — transfer beef to covered braise at 140 °C;
- 17:00 — first tenderness check; if ready, rest beef and reduce juices in parallel;
- 17:45 — shred beef and return reduced juices;
- 18:00 — prepare fresh taco toppings;
- 18:45 — warm hard taco shells;
- 19:00 — serve.

## Planner semantics exercised
This third real meal intentionally exercises existing V1 concepts rather than extending the schema:
- multiple meal components;
- same-day advance-prep reminders plus active tasks;
- shared exclusive Woodfire resource across salsa, smoke and braise;
- passive tempering concurrent with Woodfire work;
- stovetop reduction concurrent with passive meat rest;
- tenderness observation + recheck;
- temperature logging as supporting information;
- baseline service buffer that can absorb a limited long-cook delay;
- final oven task independent of the Woodfire.

No new resource model, batching model or planning-window abstraction is required for this recipe.

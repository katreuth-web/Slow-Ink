# Aura — Manifestation Planner

A glassy, pastel-purple manifestation planner for intention-setting and reflection, with a notebook of its own. Plain HTML, CSS and JavaScript: no build step, no framework, no accounts, no internet needed.

Aura is a reflection and intention-setting tool. Nothing in it promises a result, and the copy is written that way on purpose. Keep that wording in your listing.

## Pages

| Section | What's inside |
| --- | --- |
| Home | A dashboard for today: affirmation of the day, practice ring, number tiles (practices, streak, visualization minutes, intentions growing), this week, growing intentions with alignment bars, 369 sets, moon of the day and a notebook peek. A getting-started checklist and a one-click sample planner ("Look around with sample data" / "Start fresh") live here. |
| Planner | **Year** (word of the year, dreams, 12 linked mini-calendars) · **Month** (calendar with new/full moon markers, monthly intention, reflect-on-last-month prompts, focus areas, rituals grid) · **Week** (focus, inspired actions, pulse, rituals grid) · **Daily Practice** (intention and "I am", moon of the day, affirmation of the day, practice checklist, inspired actions, mood, energy, emotions, gratitude, act-as-if, signs, evening reflection prompts, brain dump) |
| Manifest | **My Manifestations** (a Planted → Growing → Manifested → Released board; each one has a why, how it will feel, an affirmation, a next step, an alignment check-in with a small chart, and a log of signs, wins and steps) · **Scripting** (five starting templates, writing tips, link a script to a manifestation) · **Visualize** (a guided 3, 5 or 10 minute session with a breathing orb, prompts, optional soft chime, session log and streak) · **Affirmations** (49 original affirmations in seven categories, favourites, your own, "I said it" counters) · **Rituals & Moon** (369 method with a 35-day heat map, 55 × 5, gratitude jar, signs & synchronicities, moon phase with new/full-moon dates and a journal page for each lunar cycle) |
| Align | Level 10 Life wheel (a low area becomes a manifestation in one tap) · Ikigai · Dream Map (mind map) · Vision Board with photos · Habits as daily rituals |
| Notebook | A bound book on a violet desk with section tabs and a contents page. Seven papers (lined, blank, dot grid, squared, Cornell, 2 and 3 columns). **Write** with Title / Heading / Subhead styles, bold, italic, underline, lists, divider lines and links. **Decorate** with photos and 81 stickers (a Manifest set with lotus, infinity, inner eye, wings, angel numbers and "I am" labels, plus nature, hearts, moon phases, cosy things and washi tape). **Draw** with the Type / Markup toggle (pen, marker, pencil, eraser, seven inks, undo/redo, Apple Pencil pressure and palm rejection). |
| Insights | **Pattern Insights** works out patterns across mood, practices, rituals, emotions and reflections on the device, with optional written reflections from Claude · **Thought Sorter** turns a brain dump into small inspired actions and intention ideas |

Moon phases are calculated from the average lunar cycle, so dates can be off by about a day. They are for rituals, not astronomy.

### Optional Claude key

Without an API key everything works offline. If a buyer adds their own Claude API key under **Insights → Pattern Insights**, the browser calls `api.anthropic.com` directly. The key is stored only in that browser. The prompts tell Claude never to promise or predict outcomes.

## For the seller

- No server, database or login. Nothing to host or maintain.
- Fonts (Poppins, Caveat, Nunito, Inter; all SIL Open Font License) are bundled in `fonts/`. Keep the `LICENSE-*.txt` files in the zip.
- Personalise (palette button, top right): four colour themes (Violet, Rose, Ocean, Meadow), light / dark / auto, three font choices and three backgrounds. It is saved in the planner's own data (`ui.look`), so it travels with a backup and is applied before first paint (small script in `index.html`). Everything is CSS variables; notebook paper stays light in dark mode on purpose.
- All planner data lives under one `localStorage` key, `aura-planner-v1`. Photos live in IndexedDB and are included in backups.
- Scripts are classic `<script>` tags on purpose, so the app works when opened from a file. Files: `core.js` (state, safe-HTML filter, moon maths, router), `stickers.js`, `calendar.js` (planner pages), `practice.js` (affirmations, rituals, moon), `manifest.js` (tracker, scripting, visualize), `look.js` (Personalise), `home.js` (dashboard, checklist, sample planner), `frameworks.js` (wheel, Ikigai, vision board, dream map), `wellness.js` (habits), `notebook.js`, `coach.js`, `main.js` (settings, backup and restore).
- Restoring a backup rebuilds the state from known fields only (`A.cleanState` in `main.js`): ids and dates are checked, notebook text goes through the safe-HTML filter, stickers must exist, photo data must be a real image.
- Older Aura saves still open. Days written with the first version keep their gratitude and reflections.
- All 49 affirmations are original text written for this planner.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/aura-planner/`.

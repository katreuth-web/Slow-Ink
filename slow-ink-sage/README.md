# Slow Ink Sage

A warm, paper-and-sage yearly planner with a notebook of its own. Plain HTML, CSS and JavaScript — no build step, no framework, no accounts, no internet needed.

## Pages

**Today** · **Year** · **Month** · **Week** · **Day** · **Habits** · **Goals** · **Reflect** · **Notebook**

- **Today** is the home dashboard. It opens on the real date with a greeting, an intention, a year-progress ring and four live numbers (tasks done, habits today, best habit streak, average goal progress). Below that: today's tasks, this week at a glance, habits with current streaks, goals with progress bars, the next starred key dates, mood and the latest notebook page.
- **Getting started** is a checklist on Today that ticks itself off as you use the planner (intention, a task, a habit, a goal, a key date, a notebook page, a backup). It can be hidden.
- **Sample data**: "Look around with sample data" (or "Try sample data" in the footer) fills the planner with a made-up, lived-in year. The dates move with today, so it always looks current. A banner offers "Start fresh" to clear it. Use it for listing screenshots.
- **Year** shows all twelve months. Days with plans get a dot, key dates are highlighted, and the page lists every key date of the year.
- **Month** shows what's planned right inside each day (a dot per task on phones), plus a monthly focus and stats.
- **Week** has a column per day with quick-add, a weekly focus and a "looking back" box.
- **Day** has an intention, tasks (star one to make it a key date), habits, mood and a few lines about the day.
- **Habits** is a month grid with streaks. **Goals** breaks a goal into steps with a progress bar. **Reflect** has monthly and yearly prompts.
- Works for any year. Use the arrows on the Year, Month and Week pages to move around.

## Navigation

On screens 1100px wide or more (laptops and desktops) a **left-hand menu** groups the pages: Plan (Today, Year, Month, Week, Day), Track (Habits, Goals, Reflect) and Journal (Notebook), with Personalise and Back up at the bottom. The Notebook still opens full-screen as its own book. On tablets in portrait and on phones the menu is replaced by the tab bar across the top.

## Personalise

The palette button in the top bar (or "Personalise" in the footer) opens a panel with your name (used in the greeting on Today) and three choices. They save with the planner, so they travel with a backup:

- **Colour:** Sage, Clay, Dusk or Rose.
- **Appearance:** Light, Dark, or Auto (follows the phone or computer). The notebook paper stays light in dark mode, so ink, photos and stickers look right.
- **Font:** Classic (Fraunces and Questrial), Cozy (Lora and Nunito) or Modern (Inter).

## The Notebook

Opening it steps out of the planner into a bound notebook on its own green desk.

- Coloured **section tabs** down the edge (Journal, Notes, Ideas — add, rename or delete your own).
- A **Contents** page listing every page in the section.
- Four papers per page: lined, blank, dot grid, squared.
- **Write:** a formatting bar for Title, Heading and Subhead styles, bold, italic, underline, bulleted and numbered lists, divider lines and links (select text, press the link button or Ctrl/Cmd+K). Headings are sized to the ruled lines so everything stays on the paper.
- **Decorate:** add **photos** (JPEG/PNG, resized automatically; also paste or drop a picture onto the page) and **stickers** (64 hand-drawn SVG stickers: nature, hearts & stars, moon phases and sky, cosy things, washi tape, labels and doodles). Drag to move, use the corner handle to resize and the top handle to turn. Bring forward, send back, duplicate and delete from the bar; arrow keys nudge and Delete removes.
- **Type / Markup** toggle: type on the page, or switch to Markup to handwrite, highlight and sketch with pen, marker, pencil and eraser, seven inks, adjustable width, undo/redo. Works with mouse, finger and stylus (palm rejection once a stylus is detected). Ink sits on top of photos and stickers.
- "Today's journal entry" buttons on the Today and Day pages open (or create) a dated journal page.
- Print any page from the printer button.

## For buyers

1. Unzip the folder.
2. Double-click `index.html`. It opens in your browser. That's it — no internet required.
3. Everything you write is saved in your browser on this device.
4. **Back up now and then**: use "Back up planner" at the bottom of any page. It downloads a file you can restore later with "Restore backup", including on a new device.

Use the same browser each time you open it (Chrome, Edge, Firefox and Safari all work). Clearing your browser's site data will erase the planner, so keep a backup.

## For the seller

- No server, database or login. Nothing to host, nothing to maintain.
- Fonts (Fraunces, Questrial, Lora, Nunito, Inter; all SIL Open Font License) are bundled in `fonts/`, so it looks identical offline. Keep the `LICENSE-*.txt` files in the zip.
- All planner data lives under one `localStorage` key, `slow-ink-sage-v1` (see `js/core.js`).
- Scripts are classic `<script>` tags on purpose: ES modules are blocked by browsers when a page is opened from a file.
- Files: `index.html`, `styles.css`, `js/core.js` (dates, saving, backup/restore, the safe-HTML filter), `js/images.js` (photo storage), `js/stickers.js` (the sticker library), `js/views.js` (planner pages), `js/notebook.js` (notebook, editor, photos/stickers and ink), `js/sample.js` (the sample planner and getting-started actions), `js/look.js` (the Personalise panel), `js/main.js` (routing and events).
- Notebook text is stored as a small, safe subset of HTML (`h1–h3`, `p`, `strong`, `em`, `u`, lists, `hr`, `a`). Everything typed, pasted or restored from a backup passes through `SI.sanitizeHtml`, and a restored backup is also checked for unexpected ids and dates before anything is replaced.
- Photos live in IndexedDB (not localStorage) and are included in backups. If a browser blocks IndexedDB, photos fall back to localStorage.
- Stickers are SVG strings in `js/stickers.js`; recolour the whole set by editing the palette `P` at the top of that file.
- Colours are CSS variables. Each theme is a pair of blocks near the top of `styles.css` (light and dark); add a theme by copying one pair, then add its name to `THEMES` in `js/look.js` and to the small script in `index.html`'s `<head>` (which applies the saved look before the page paints).

## Running locally

Open `index.html` directly, or serve the folder:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000/slow-ink-sage/` (from the repo root).

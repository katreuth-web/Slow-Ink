# Slow Ink Sage

A warm, paper-and-sage yearly planner with a notebook of its own. Plain HTML, CSS and JavaScript — no build step, no framework, no accounts, no internet needed.

## Pages

**Today** · **Year** · **Month** · **Week** · **Day** · **Habits** · **Goals** · **Reflect** · **Notebook**

- **Today** opens on the real date: an intention, today's tasks, this week at a glance, habits, mood and the last notebook page.
- **Year** shows all twelve months. Days with plans get a dot, key dates are highlighted, and the page lists every key date of the year.
- **Month** shows what's planned right inside each day (a dot per task on phones), plus a monthly focus and stats.
- **Week** has a column per day with quick-add, a weekly focus and a "looking back" box.
- **Day** has an intention, tasks (star one to make it a key date), habits, mood and a few lines about the day.
- **Habits** is a month grid with streaks. **Goals** breaks a goal into steps with a progress bar. **Reflect** has monthly and yearly prompts.
- Works for any year. Use the arrows on the Year, Month and Week pages to move around.

## The Notebook

Opening it steps out of the planner into a bound notebook on its own green desk.

- Coloured **section tabs** down the edge (Journal, Notes, Ideas — add, rename or delete your own).
- A **Contents** page listing every page in the section.
- Four papers per page: lined, blank, dot grid, squared.
- **Type / Markup** toggle: type on the page, or switch to Markup to handwrite, highlight and sketch with pen, marker, pencil and eraser, seven ink colours, adjustable width, undo/redo. Works with mouse, finger and stylus (palm rejection once a stylus is detected).
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
- Fonts (Fraunces, Questrial — both SIL Open Font License) are bundled in `fonts/`, so it looks identical offline. Keep the two `LICENSE-*.txt` files in the zip.
- All planner data lives under one `localStorage` key, `slow-ink-sage-v1` (see `js/core.js`).
- Scripts are classic `<script>` tags on purpose: ES modules are blocked by browsers when a page is opened from a file.
- Files: `index.html`, `styles.css`, `js/core.js` (dates, saving, backup), `js/views.js` (planner pages), `js/notebook.js` (notebook and ink), `js/main.js` (routing and events).
- Colours are CSS variables at the top of `styles.css`; changing `--forest` and `--sage` re-tints the whole planner.

## Running locally

Open `index.html` directly, or serve the folder:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000/slow-ink-sage/` (from the repo root).

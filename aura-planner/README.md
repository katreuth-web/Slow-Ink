# Aura — Glass Life Planner

A glassmorphic, all-in-one digital life planner in crisp whites and pastel purples & pinks. Plain HTML, CSS and JavaScript: no build step, no framework, no dependencies. It lives in this repo as a standalone app, separate from Slow Ink.

## App flow

- **Quick-flip ribbon.** The top ribbon switches between Planner, Life Design, Wellness, Notebook, AI Coach and Board Sync. A sub-ribbon lists the pages in each section.
- **Calendar horizons.** Year → Month → Week → Daily Focus. Month names, week numbers and dates link to their pages. A side index of month tabs sits on every calendar page and becomes a horizontal strip on phones.
- **Cards everywhere.** Every item on every page is its own frosted-glass card.

## Features

| Area | What's inside |
| --- | --- |
| Year | Word of the year, big goals, year-to-date stats, 12 linked mini-calendars with week numbers |
| Month | Calendar with week links, mood dots and task previews; monthly intention & goals; last-month reset recap (tasks, mood, habits, workouts, spending) with reflection prompts; focus areas from your life wheel; habit grid |
| Week | Week focus, priorities, pulse stats, seven day cards with inline tasks, weekly habit grid |
| Daily Focus | Intention, Top 3, tasks tagged with Eisenhower quadrants, 6 AM–11 PM schedule, 10-point mood, hydration drops, 10 focus sessions with a 25-minute timer, break check-offs, self-care, meals, brain dump, evening reflection |
| Life Design | Level 10 Life wheel with live polar chart and "set goal" for low areas · Ikigai four-circle map with intersections · Eisenhower matrix that sends items to today · SMART goals with milestones and progress rings · draggable mind map · vision board |
| Wellness | Habits (streaks, best streaks, monthly grid) · Finances (income, expenses, category budgets, spending donut, savings goals) · Meals (weekly planner, aisle-sorted grocery list, recipe cards) · Fitness (workout log, weekly minutes ring, weight trend chart) |
| Notebook | Blank, lined, dot grid, squared, Cornell, 2-column and 3-column paper. An iOS-style **Type / Markup** segmented toggle switches between typing and drawing. Markup mode has a floating palette with pen, marker, pencil and eraser, seven inks, stroke width, undo/redo and clear. It supports Apple Pencil pressure and ignores your palm once a stylus is in use. |
| AI Coach | **Habit & Journal Analyzer** finds patterns across mood, hydration, focus, habits, workouts and reflections on-device, with optional written coaching from Claude · **Priority Synthesizer** turns brain dumps or notebook pages into Eisenhower-sorted actions and SMART goal ideas |
| Board Sync | Push tasks (today / week / month) to a monday.com board with status and date, pull changes back, import board items |

### Image uploads

Recipe cards and the vision board accept photos. You can pick a file or drag and drop it. Images are resized in the browser (max 1400px, JPEG) and stored in IndexedDB, so they don't use up the localStorage quota. Backups include them.

### AI coach and Claude

Without an API key, the coach works entirely offline with on-device rules. You can add your own Claude API key under **AI Coach → Coach settings**. The browser then calls `api.anthropic.com` directly: Claude Opus 5 by default, or Claude Sonnet 5. The key is stored only in this browser. The synthesizer uses structured JSON output so its suggestions map straight onto the matrix and goals.

### monday.com

**Board Sync** takes a personal API token and a board ID. Push creates or updates one item per task and fills the board's first status and date columns. Pull applies status and name changes back to your tasks.

## Data

Planner data is saved automatically to `localStorage` and photos to IndexedDB. **Settings** (the gear icon) has JSON export/import and reset.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/aura-planner/`.

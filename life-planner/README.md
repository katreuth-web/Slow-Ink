# Slow Ink Life — All-in-one Digital Planner

A soft, neumorphic + glassmorphic life planner built with plain HTML5, CSS and JavaScript — no build step, no framework, no dependencies. It lives alongside the original Slow Ink planner in this repo as its own static app.

## App flow

- **Calendar spreads** — Yearly → Monthly → Weekly → Daily, linked by drill-downs, breadcrumbs and prev/next arrows.
- **Period reviews** — every spread has a matching reflection page (`…/review`) with a progress audit (tasks, habit consistency, mood, workouts, water, spending, journal pages), wins, challenges, lessons, gratitude, a 1–10 rating and next steps. The daily review can move unfinished tasks to tomorrow; the weekly review copies open priorities to next week.
- **Life hubs** — Fitness, Meals & Recipes, Finance, Mind & Ikigai, Travel, Home & Chores. **Productivity** — Habits, Mood Log, Goals, Projects, Vision Board, Mind Map (more pages coming).
- **Notebook** — opens as a bound book on its own desk: coloured section tabs (Journal, Notes, Ideas, plus your own), a contents page, and nine papers to write, draw or arrange on.

Navigation is a floating glass sidebar on desktop and an iOS-style neumorphic dock (plus an "All sections" sheet) on mobile.

## Features

| Area | What's inside |
| --- | --- |
| Daily spread | Top three, prioritised tasks & deadlines, 6am–10pm schedule, mood, hydration, habits, meals, movement, gratitude, notes, and quick links to the trackers and a journal page for the day |
| Fitness | Workout log, weekly minute target, milestones, weight curve, 14-day hydration chart |
| Productivity | **Habits** (monthly habit grid with colours and streaks), **Mood Log** (mood calendar and distribution), **Goals** (name, why, plan, start and target date or timeframe, action steps with dates, automatic progress, check-ins with a progress curve, a plain-language review of pace and plan, and an optional SMART check; SMART goals from older planners are brought across once), **Projects** (a one-page planning framework, phases with dated steps, progress per phase and overall, and a plain-language review of pace and plan), **Vision Board** and **Mind Map** (you can keep several of each; they are stored with the notebook pages but have their own pages) |
| Meals & Recipes | Weekly breakfast/lunch/dinner/snack planner, recipe cards organised in photo sections (Breakfast, Lunch, Dinner, Snacks, Desserts, Drinks, plus any you add), each with its own cover photo and recipe photos, a grocery list that sorts items into aisles automatically, and "Build grocery list" from the week's planned recipes |
| Finance | Monthly income & spending with a category donut, savings pots, debt paydown progress, subscriptions with renewal countdowns and "Paid" roll-forward |
| Mind | Interactive Ikigai four-circle tool, Level 10 Life wheel (radar chart), Eisenhower matrix |
| Travel | Trips with itinerary, packing list (with an essentials preset), daily outfits (with a photo of each look) and a budget, plus a photo album for each trip; and a bucket list. Photos are stored in IndexedDB and included in backups |
| Home & Chores | Daily / weekly / monthly / seasonal chore charts by room, with an assignee field; check-offs reset automatically each period |
| Notebook | A bound book with section tabs and a contents page. Blank, lined, square grid, dot grid, Cornell notes, two-column and three-column papers. (Mind maps and vision boards have their own pages under Productivity.) A **Type / Markup** toggle switches lined/grid/dot/Cornell/column pages between typing and drawing with a floating palette: pen, marker, pencil, eraser, seven inks, stroke width, undo/redo. Drawings are saved as strokes, and older drawings still show underneath. Journal pages linked from a day live in the Journal section. Print any page. |

Four colour themes (Blush, Sage, Sky, Lilac), light / dark / auto, three font pairings (Settings → Personalise); a Today dashboard with number tiles, a year ring, a getting-started checklist and a one-click sample planner; everything is saved to `localStorage`, with JSON export/import and reset under **Settings**.

## Running locally

Static site, no build step:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/life-planner/` in your browser.

## Photos on recipes

Recipe photos and section covers are stored in the browser's image storage (IndexedDB), not in the main save, so many photos won't fill the planner's storage. They are included in backups. Vision board images still use the older storage and are a candidate to move across later.

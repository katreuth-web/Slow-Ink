# Slow Ink Life — All-in-one Digital Planner

A soft, neumorphic + glassmorphic life planner built with plain HTML5, CSS and JavaScript — no build step, no framework, no dependencies. It lives alongside the original Slow Ink planner in this repo as its own static app.

## App flow

- **Calendar spreads** — Yearly → Monthly → Weekly → Daily, linked by drill-downs, breadcrumbs and prev/next arrows.
- **Period reviews** — every spread has a matching reflection page (`…/review`) with a progress audit (tasks, habit consistency, mood, workouts, water, spending, journal pages), wins, challenges, lessons, gratitude, a 1–10 rating and next steps. The daily review can move unfinished tasks to tomorrow; the weekly review copies open priorities to next week.
- **Life hubs** — Habits & Fitness, Meals & Recipes, Finance, Mind & Ikigai, Travel, Home & Chores.
- **Notebook** — pick a paper and write, draw or arrange on an interactive canvas.

Navigation is a floating glass sidebar on desktop and an iOS-style neumorphic dock (plus an "All sections" sheet) on mobile.

## Features

| Area | What's inside |
| --- | --- |
| Daily spread | Top three, prioritised tasks & deadlines, 6am–10pm schedule, mood, hydration, habits, meals, movement, gratitude, notes, and quick links to the trackers and a journal page for the day |
| Habits & Fitness | Monthly habit grid with colours and streaks, workout log, weekly minute target, milestones, weight curve, 14-day hydration chart |
| Meals & Recipes | Weekly breakfast/lunch/dinner/snack planner, editable recipe cards, a grocery list that sorts items into aisles automatically, and "Build grocery list" from the week's planned recipes |
| Finance | Monthly income & spending with a category donut, savings pots, debt paydown progress, subscriptions with renewal countdowns and "Paid" roll-forward |
| Mind | Interactive Ikigai four-circle tool, Level 10 Life wheel (radar chart), SMART goals, Eisenhower matrix, mood calendar |
| Travel | Trips with itinerary, packing list (with an essentials preset), daily outfits and a budget; plus a bucket list |
| Home & Chores | Daily / weekly / monthly / seasonal chore charts by room, with an assignee field; check-offs reset automatically each period |
| Notebook | Blank, lined, square grid, dot grid, Cornell notes, two-column, three-column, mind map (drag bubbles, add branches) and vision board (image tiles) — lined/grid/dot/Cornell/column pages also take pen, highlighter and eraser ink with undo |
| Board Sync | Push tasks (today / this week / this month) to a monday.com board and pull statuses back — see below |

Soft light and soft dark themes; everything is saved to `localStorage`, with JSON export/import and reset under **Settings**.

## monday.com board sync

The **Board Sync** page connects to your *PDF Digital Planner* monday board with a personal API token (monday.com → avatar → Developers → My access tokens) and the board ID from its URL. The token is stored only in this browser and sent straight to `api.monday.com`.

- **Push** creates an item per task, fills the board's first date column with the task's day and its first status column with "Done" / "Working on it". Re-pushing updates the linked item instead of duplicating it.
- **Pull** lists the board's items, applies status and name changes back to linked tasks, and lets you import unlinked items as tasks on their date.

## Running locally

Static site, no build step:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/life-planner/` in your browser.

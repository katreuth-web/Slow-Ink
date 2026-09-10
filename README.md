# Slow Ink — Digital Planner

A calm, tactile yearly planner built with plain HTML5, CSS and JavaScript — no build step, no framework, no dependencies.

## Sections

Cover · Year Overview · Monthly · Weekly · Daily · Habit Tracker · Goals · Reading Log · Finance
Notes · Meal Planner · Travel Planner · Fitness & Wellness · Reflections

## Features

- Full calendar logic (year/month/week/day views, all linked together), supporting any year via the
  prev/next control on the Year Overview page
- Two hand-mixed colour themes — **Greek Marble** (light) and **Soft Black** (dark) — toggle in the drawer menu
- Daily wellness tracking: mood, energy, stress, weather, water, sleep, meals, an hourly schedule, and an affirmation
- Habit Tracker with per-habit simple/three-state (not-today/partial/done) tracking
- Reading log with ratings, favorite quotes, key takeaways, and reading progress
- Goals workspace with steps, milestones, action steps, and a computed progress bar
- Finance with a ledger, budget (fixed/variable categories), savings goals, bills, and debt tracking,
  plus a spending-by-category chart
- Meal Planner (weekly grid, categorized grocery list, recipe box) and Travel Planner (bucket list,
  destinations, packing checklist)
- Fitness & Wellness: workout log, body measurements, cycle tracker, and doctor questions
- Reflections: Ikigai, Wheel of Life, Stoic Mindset, Life Inventory, cadence-based reflection journals
  (daily/weekly/monthly/yearly), an Eisenhower Matrix, and a Mind Map tool
- Sticky notes plus a "Notebook Pages" appendix with optional user-labeled sections and paper styles
- Everything is saved automatically to `localStorage` in your browser
- Export/import your planner as a JSON file, or reset it entirely
- Responsive layout for smaller screens

## Running locally

This is a static site — no build step required. Serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

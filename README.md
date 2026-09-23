# Slow Ink — 2027 Digital Planner

A calm, tactile yearly planner built with plain HTML5, CSS and JavaScript — no build step, no framework, no dependencies.

## Sections

Cover · Year Overview · Monthly · Weekly · Daily · Habit Tracker · Goals · Reading Log · Finance Ledger · Notes · Meal Planner · Travel Planner · Fitness & Wellness · Reflections

## Features

- Full 2027 calendar logic (year/month/week/day views, all linked together), with multi-year support underneath
- Three colour themes — **Editorial** (light, monochrome ink-on-cream with a bold italic serif), **Soft Black** (dark) and **Midnight Luxury** (dark) — pick one from the menu
- Budget tracking with a category breakdown chart, savings goals, bills and debts
- Workout logging, body measurements and cycle tracking
- A notebook with lined, grid and dot paper styles, plus ikigai, wheel of life, stoic journaling exercises and mind maps
- The hamburger icon is the only way to open the main menu; the house icon at the bottom-left of the tab bar returns to the cover page
- Everything is saved automatically to `localStorage` in your browser
- Export/import your planner as a JSON file, or reset it entirely
- Responsive layout for smaller screens

## Also in this repo

- **[Slow Ink Life](life-planner/)** — a soft neumorphic, all-in-one life planner with linked yearly/monthly/weekly/daily spreads, period reviews, life hubs (habits & fitness, meals, finance, mind, travel, home care), a multi-paper notebook and monday.com board sync. See [`life-planner/README.md`](life-planner/README.md).

## Running locally

This is a static site — no build step required. Serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.
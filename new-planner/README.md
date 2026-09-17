# New Planner — Digital Life Planner

A private, editorial-inspired digital life planner built with plain HTML5, CSS and JavaScript — no build step, no framework, no dependencies. Lives alongside the original Slow Ink planner in this repo as its own static app.

## Views

Year · Month · Week (with a drag-and-drop time-blocking grid) · Day · Tracking Hub (Finance + Fitness & Mind) · Notes

## Features

- Full Year → Month → Week → Day navigation, all linked via breadcrumbs and a left nav rail (bottom bar on mobile)
- Recurring tasks and appointments (daily / weekly / monthly) that automatically populate future views
- Drag-and-drop scheduling: drag a task onto the weekly time grid to give it a time, or drag a time block back to make it an unscheduled task
- Habit tracking with per-day check-offs and streaks
- Finance and fitness/mental-health tracking hubs with manual entry forms and lightweight charts
- A notes workspace with four page templates (plain, lined, grid, bulleted) that can live in a general library or be linked to a specific day
- Light and dark editorial themes, toggled from the nav rail
- Everything is saved to `localStorage` in your browser only — nothing is uploaded. Export/import your planner as a JSON file, or reset it entirely from the "More" menu.

## Not included in this build

Secure multi-user accounts and live Google/Apple/Outlook calendar sync require a real backend and OAuth credentials, which are out of scope for a static, no-build HTML/CSS/JS app. The "More" menu notes this plainly rather than faking a connection.

## Running locally

Static site, no build step:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser (serve from this `new-planner/` folder).

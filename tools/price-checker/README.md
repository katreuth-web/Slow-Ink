# Competitor price checker

Checks competitor pricing pages with the [Webcmd](https://www.npmjs.com/package/@agentrhq/webcmd) stealth browser and writes a dated report to `reports/prices-YYYY-MM-DD.md` (plus a `.json` sidecar for diffing over time).

## Prerequisites

```bash
npm install -g @agentrhq/webcmd
webcmd doctor   # must be green before running
```

On a headless machine (no display), start a virtual display first:

```bash
Xvfb :99 -screen 0 1920x1080x24 & export DISPLAY=:99
webcmd daemon restart
```

## Run

```bash
node tools/price-checker/check-prices.mjs
```

## Add or change competitors

Edit `competitors.json` — each entry needs a `name`, the pricing page `url`, and `ourProduct` (which Slow-Ink product it competes with). The extractor is generic: it collects visible price-looking lines with one line of context, so most public pricing pages work without per-site code.

## Notes

- Pages that gate prices behind a region selector or login will come back empty; those need a per-site tweak.
- Compare two dated JSON reports to see price changes between runs.

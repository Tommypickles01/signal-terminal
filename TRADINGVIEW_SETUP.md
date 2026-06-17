# TradingView Charting Library — Setup

This is the **same charting engine DexScreener uses**. It ships the real
native drawing tools (fib retracement, trend lines, pitchfork, gann, etc.)
and full studies. It is **not freely downloadable** — you must request access
once (free), then self-host the files.

Everything on our side is already built:

- `tv/datafeed.js` — feeds the chart from GeckoTerminal (the same OHLC source
  the main terminal uses), so it charts the exact pools you load.
- `tv-chart.html` — a self-contained page that mounts the library with a dark
  theme, our green/red candles, and all drawing tools enabled.
- `tv/tv-overrides.css` — optional cosmetic tweaks.

You only need to drop in the library files.

---

## Step 1 — Request access (one time, free)

1. Go to <https://www.tradingview.com/advanced-charts/> and click
   **Get Library**. (The old `/charting-library/` URL now 404s.)
2. Sign in with a TradingView account and submit the short form. It asks for a
   **GitHub username** — if approved they grant you access to a private repo:
   `tradingview/charting_library`. (Until access is granted, that repo URL 404s
   — that's expected.)
3. You'll get a GitHub invite if approved.

> **Licensing caveat (read this first).** TradingView currently does **not**
> grant Advanced Charts for personal/hobby/study/testing use, and the license
> **forbids placing the library in a public repository** or behind a paywall.
> This repo is public (GitHub Pages), so a personal request may be declined,
> and committing `charting_library/` here would breach their terms. If that
> blocks you, see "Alternatives" at the bottom of this file.

## Step 2 — Get the files into this repo

1. Accept the GitHub invite, then download/clone `tradingview/charting_library`.
2. Copy the **`charting_library/`** folder from that repo into the root of THIS
   repo, next to `tv-chart.html`, so the path is:

   ```
   signal-terminal/
   ├─ index.html
   ├─ tv-chart.html
   ├─ tv/
   │  ├─ datafeed.js
   │  └─ tv-overrides.css
   └─ charting_library/          <-- you add this
      ├─ charting_library.standalone.js
      ├─ bundles/
      └─ ...
   ```

3. Commit and push. (The library is large; that's expected.)

> Note: the TradingView license allows self-hosting on your own site, which is
> exactly this. Don't re-distribute the files outside your deployment.

## Step 3 — Test it

Open (locally or on GitHub Pages):

```
tv-chart.html?symbol=solana:POOL_ADDRESS&interval=60
```

- `symbol` = `<network>:<poolAddress>` using GeckoTerminal network slugs
  (`solana`, `eth`, `base`, `bsc`, `arbitrum`, `polygon_pos`, `avax`).
- `interval` = `1`, `5`, `15`, `60`, `240`, `720`, or `1D`.

You should see the full TradingView chart with the left drawing toolbar
(fib retracement is under the Gann/Fib group), fed by live GeckoTerminal data.

Until the `charting_library/` folder exists, the page shows a short message
explaining what to do (nothing breaks).

---

## Step 4 — Embed it into the main terminal (optional)

The cleanest way to keep the trade panel, watchlist, and signals while getting
the real tools is to drop the TradingView chart into the CHART tab as an
`<iframe>`. In `index.html`, replace the Lightweight-Charts price container
with:

```html
<iframe id="tvframe" title="chart"
        style="width:100%;height:620px;border:0;border-radius:12px;overflow:hidden"
        src="tv-chart.html?symbol=solana:So11111111111111111111111111111111111111112&interval=60">
</iframe>
```

Then, when a token loads, point the iframe at it. Two options:

- **Reload the iframe** (simplest):
  ```js
  document.getElementById('tvframe').src =
    'tv-chart.html?symbol=' + lastReq.net + ':' + lastReq.pool + '&interval=60';
  ```
- **Live switch without reload** (smoother) — `tv-chart.html` listens for a
  `postMessage`:
  ```js
  document.getElementById('tvframe').contentWindow.postMessage(
    { type: 'tv-symbol', symbol: lastReq.net + ':' + lastReq.pool, interval: '60' }, '*');
  ```

Tell me once the files are in and I'll wire the iframe + token-switching into
`index.html` for you (and we can decide whether to keep the existing
Lightweight chart as a fallback or remove it).

---

## What carries over vs. what changes

- **Drawing tools**: native TradingView (fib, trend, etc.) — the goal. ✅
- **Standard studies** (EMA, RSI, Bollinger, Volume): built into the library;
  add them from its toolbar. ✅
- **Custom stuff** in the current chart (your WaveTrend, projection cone, the
  auto BUY/SELL signal dots, and the paper-trade "T" markers) are tied to the
  Lightweight engine. Porting those onto the TradingView chart is a separate
  task (TradingView custom studies + `chart().createShape()` for markers) — say
  the word if you want them moved over too.

---

## Alternatives (if the Charting Library is blocked)

The Charting Library is the only way to get TradingView's *own* drawing tools,
but for a public/personal project it's often not granted. Realistic options:

1. **Embed the DexScreener chart directly (easiest, free).** DexScreener exposes
   an embeddable chart for any pool:
   `https://dexscreener.com/<chain>/<pairAddress>?embed=1&theme=dark`. Drop it in
   an `<iframe>` in the CHART tab. You get *their* full toolbar (fib, trend,
   etc.) for free, but you lose your custom overlays/markers (they live on
   DexScreener's chart, not yours) and you can't drive trades from clicks on it.

2. **Add drawing tools onto the existing Lightweight chart (full control).**
   Lightweight Charts has no built-in tools, but trend lines, horizontal lines,
   and fib retracements can be hand-built on a transparent canvas overlay that
   tracks the chart's time/price scale. More work, but keeps your signals,
   markers, projection cone, and click-to-trade intact. (A basic
   trendline/hline/fib set is very doable.)

3. **Stick with the TradingView free *widget* (not the library).** The
   `tv.js`/`embed-widget` advanced chart has the real tools but only charts
   exchange-listed symbols — it **cannot** chart arbitrary Solana pool addresses,
   so it doesn't fit on-chain memecoins. Not recommended for your use case.

Recommendation: if you want the real tools fast, go with **Option 1**
(DexScreener iframe). If you want to keep your custom signals + click-to-trade,
go with **Option 2** (overlay tools on the current chart).

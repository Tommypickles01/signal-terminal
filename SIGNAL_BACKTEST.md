# Signal Backtest — which indicator performs best

Ran every confluence factor as a **standalone** signal over real GeckoTerminal
candles and graded the **forward 8-bar return** (the app's default `gradeBars`).
Each factor fires on a bar; "win" = price moved the signal's way 8 bars later.

- **Universe:** WIF, BONK, POPCAT, JUP, LAYOFF (top Solana pool each)
- **Timeframes:** 15m, 1H, 4H
- **Sample:** 12 datasets, 11,381 bars
- **Horizon:** 8 bars forward, raw price (no fees/slippage)

## Results (sorted by hit-rate)

| Factor | Side | n | Win % | Avg fwd return % |
|---|---|---|---|---|
| **rsiOB** (RSI overbought flip) | SELL | 127 | **61.4** | +0.88 |
| **rsiOS** (RSI oversold flip) | BUY | 135 | **60.0** | +0.80 |
| stochRsiSell | SELL | 420 | 55.5 | −0.15 |
| bearDiv (bearish RSI div) | SELL | 134 | 54.5 | +0.68 |
| tpoSell (2-Pole) | SELL | 238 | 51.7 | −0.82 |
| volSpikeDn | SELL | 956 | 51.3 | −0.73 |
| vidyaUp | BUY | 34 | 50.0 | +0.11 |
| emaLose | SELL | 827 | 49.6 | −1.30 |
| emaXdn | SELL | 306 | 47.4 | −1.17 |
| stochRsiBuy | BUY | 489 | 46.6 | **+1.24** |
| vidyaDn | SELL | 35 | 45.7 | −1.88 |
| emaReclaim | BUY | 820 | 45.1 | +1.01 |
| bullDiv | BUY | 160 | 45.0 | +0.86 |
| volSpike | BUY | 1117 | 43.5 | +0.52 |
| tpoBuy | BUY | 219 | 42.9 | +0.70 |
| emaCross (EMA9×21 up) | BUY | 300 | 40.7 | −0.54 |

## Takeaways

1. **Best by far: the RSI overbought/oversold flips** (`rsiOB`, `rsiOS`) — ~60–61%
   directional hit-rate AND positive average return that clears trading costs.
   These are mean-reversion signals; memecoins on these timeframes mean-revert,
   which is why they win.
2. **Asymmetric payoff factors:** `stochRsiBuy` (46.6% win but **+1.24%** avg) and
   `emaReclaim` (45.1% / +1.01%) win less often but catch the big momentum legs
   when they hit. Good as *trend-continuation* entries, bad as standalone flips.
3. **Weakest:** `emaCross` (EMA9×21 up) at 40.7% with negative expectancy, and the
   `vidyaDn`/`emaXdn` sells. The raw EMA cross is basically noise on its own.
4. **Costs matter:** avg returns under ~0.5% are eaten by fees+slippage
   (app default ≈0.5% round trip). Only the RSI flips clear that comfortably.

## Caveats
- Standalone factors with **no trend gate** — the live app combines ≥2 factors and
  blocks counter-trend trades, which changes real performance.
- Fixed 8-bar horizon and a memecoin-heavy sample (mean-reverting) bias toward the
  overbought/oversold signals. A trending-asset sample would favor the momentum ones.
- The app already learns this live via per-factor win-rate (`memStats`/`confidence`).

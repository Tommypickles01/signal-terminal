/* =====================================================================
   GeckoTerminal -> TradingView Charting Library datafeed
   ---------------------------------------------------------------------
   Implements the JS Datafeed API the Charting Library expects, backed by
   the SAME GeckoTerminal OHLCV endpoint the main terminal already uses,
   so it charts the exact pools you load (Solana / ETH / Base / etc.).

   Symbol format:  "<gtNetwork>:<poolAddress>"   e.g.  "solana:7xKX...pump"
                   (a bare pool address defaults to the "solana" network)

   Usage (see tv-chart.html):
     new TradingView.widget({ datafeed: GeckoDatafeed(), ... })
   ===================================================================== */
(function (global) {
  'use strict';

  var GT = 'https://api.geckoterminal.com/api/v2';
  var DS = 'https://api.dexscreener.com/latest/dex';

  // TradingView resolution -> GeckoTerminal {timeframe, aggregate}
  var RES = {
    '1':   { tf: 'minute', agg: 1,  secs: 60 },
    '5':   { tf: 'minute', agg: 5,  secs: 300 },
    '15':  { tf: 'minute', agg: 15, secs: 900 },
    '60':  { tf: 'hour',   agg: 1,  secs: 3600 },
    '240': { tf: 'hour',   agg: 4,  secs: 14400 },
    '720': { tf: 'hour',   agg: 12, secs: 43200 },
    '1D':  { tf: 'day',    agg: 1,  secs: 86400 },
    'D':   { tf: 'day',    agg: 1,  secs: 86400 }
  };
  var SUPPORTED = ['1', '5', '15', '60', '240', '720', '1D'];

  function getJSON(url) {
    return fetch(url, { headers: { accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  function splitSymbol(name) {
    var s = String(name || '').trim();
    var i = s.indexOf(':');
    if (i > 0) return { net: s.slice(0, i).toLowerCase(), pool: s.slice(i + 1) };
    return { net: 'solana', pool: s };
  }

  // choose a sensible pricescale (decimals) from a representative price
  function priceScaleFor(p) {
    if (!(p > 0)) return 100000000;          // 8 dp default (memecoins)
    if (p >= 1000) return 100;               // 2 dp
    if (p >= 1)    return 10000;             // 4 dp
    if (p >= 0.01) return 1000000;           // 6 dp
    return 100000000;                        // 8 dp
  }

  // fetch one recent bar to size the price axis
  function probePrice(net, pool) {
    var u = GT + '/networks/' + net + '/pools/' + pool + '/ohlcv/hour?aggregate=1&limit=1&currency=usd';
    return getJSON(u).then(function (j) {
      var list = (j && j.data && j.data.attributes && j.data.attributes.ohlcv_list) || [];
      return list.length ? +list[0][4] : 0;
    }).catch(function () { return 0; });
  }

  function GeckoDatafeed(opts) {
    opts = opts || {};
    var pollMs = opts.pollMs || 15000;
    var subs = {};   // subscriberUID -> { timer, last }

    return {
      onReady: function (cb) {
        setTimeout(function () {
          cb({
            supported_resolutions: SUPPORTED,
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
            exchanges: [{ value: '', name: 'DEX', desc: 'On-chain pools' }],
            symbols_types: [{ name: 'crypto', value: 'crypto' }]
          });
        }, 0);
      },

      // optional symbol search via DexScreener
      searchSymbols: function (userInput, exchange, symbolType, onResult) {
        getJSON(DS + '/search?q=' + encodeURIComponent(userInput)).then(function (j) {
          var pairs = (j && j.pairs ? j.pairs : []).slice(0, 30);
          onResult(pairs.map(function (p) {
            var net = (p.chainId || 'solana').toLowerCase();
            var base = (p.baseToken && p.baseToken.symbol) || '?';
            var quote = (p.quoteToken && p.quoteToken.symbol) || '';
            return {
              symbol: base + '/' + quote,
              full_name: net + ':' + p.pairAddress,
              description: base + '/' + quote + ' · ' + net,
              exchange: (p.dexId || 'dex').toUpperCase(),
              ticker: net + ':' + p.pairAddress,
              type: 'crypto'
            };
          }));
        }).catch(function () { onResult([]); });
      },

      resolveSymbol: function (symbolName, onResolve, onError) {
        var s = splitSymbol(symbolName);
        probePrice(s.net, s.pool).then(function (px) {
          onResolve({
            ticker: s.net + ':' + s.pool,
            name: symbolName,
            description: symbolName,
            type: 'crypto',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: s.net.toUpperCase(),
            listed_exchange: s.net.toUpperCase(),
            format: 'price',
            minmov: 1,
            pricescale: priceScaleFor(px),
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: false,
            supported_resolutions: SUPPORTED,
            volume_precision: 2,
            data_status: 'streaming'
          });
        });
      },

      getBars: function (symbolInfo, resolution, periodParams, onResult, onError) {
        var s = splitSymbol(symbolInfo.ticker || symbolInfo.name);
        var r = RES[resolution] || RES['60'];
        var to = periodParams.to;          // unix seconds
        var from = periodParams.from;
        var u = GT + '/networks/' + s.net + '/pools/' + s.pool +
          '/ohlcv/' + r.tf + '?aggregate=' + r.agg +
          '&before_timestamp=' + to + '&limit=1000&currency=usd';
        getJSON(u).then(function (j) {
          var list = (j && j.data && j.data.attributes && j.data.attributes.ohlcv_list) || [];
          var bars = list.map(function (x) {
            return { time: (+x[0]) * 1000, open: +x[1], high: +x[2], low: +x[3], close: +x[4], volume: +x[5] };
          })
          .filter(function (b) { return b.close > 0 && b.time / 1000 >= from && b.time / 1000 < to + r.secs; })
          .sort(function (a, b) { return a.time - b.time; });
          // de-dupe identical timestamps
          var seen = {}, out = [];
          for (var i = 0; i < bars.length; i++) { if (!seen[bars[i].time]) { seen[bars[i].time] = 1; out.push(bars[i]); } }
          onResult(out, { noData: out.length === 0 });
        }).catch(function (e) { onError(String(e)); });
      },

      subscribeBars: function (symbolInfo, resolution, onTick, uid) {
        var s = splitSymbol(symbolInfo.ticker || symbolInfo.name);
        var r = RES[resolution] || RES['60'];
        function poll() {
          var u = GT + '/networks/' + s.net + '/pools/' + s.pool +
            '/ohlcv/' + r.tf + '?aggregate=' + r.agg + '&limit=2&currency=usd';
          getJSON(u).then(function (j) {
            var list = (j && j.data && j.data.attributes && j.data.attributes.ohlcv_list) || [];
            if (!list.length) return;
            // ohlcv_list is newest-first
            var x = list[0];
            onTick({ time: (+x[0]) * 1000, open: +x[1], high: +x[2], low: +x[3], close: +x[4], volume: +x[5] });
          }).catch(function () {});
        }
        subs[uid] = setInterval(poll, pollMs);
        poll();
      },

      unsubscribeBars: function (uid) {
        if (subs[uid]) { clearInterval(subs[uid]); delete subs[uid]; }
      }
    };
  }

  global.GeckoDatafeed = GeckoDatafeed;
})(typeof window !== 'undefined' ? window : this);

import { NextRequest, NextResponse } from "next/server";
import { scoredScanAnalysis, Kline } from "../../lib/analysis";

const SCAN_SYMBOLS = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","AVAXUSDT","DOGEUSDT",
  "DOTUSDT","MATICUSDT","LINKUSDT","UNIUSDT","LTCUSDT","ATOMUSDT","ETCUSDT","XLMUSDT",
  "ALGOUSDT","NEARUSDT","SANDUSDT","MANAUSDT","AXSUSDT","CRVUSDT","AAVEUSDT",
  "RUNEUSDT","VETUSDT","HBARUSDT","EGLDUSDT","ICPUSDT","FILUSDT","THETAUSDT",
  "XTZUSDT","BCHUSDT","TRXUSDT","CHZUSDT","GALAUSDT","APEUSDT",
  "LDOUSDT","OPUSDT","ARBUSDT","GMXUSDT","DYDXUSDT","IMXUSDT","RNDRUSDT","FETUSDT",
  "SUIUSDT","APTUSDT","INJUSDT","SEIUSDT","TIAUSDT","PENDLEUSDT","ORDIUSDT",
  "JUPUSDT","ENAUSDT","TAOUSDT","NOTUSDT","EIGENUSDT","GOATUSDT","PNUTUSDT",
];

function toCC(s: string) { return s.replace(/USDT$/, ""); }
function ccEndpoint(interval: string): { ep: string; agg: number } {
  if (interval === "1d")  return { ep: "histoday",    agg: 1  };
  if (interval === "4h")  return { ep: "histohour",   agg: 4  };
  if (interval === "15m") return { ep: "histominute", agg: 15 };
  return { ep: "histohour", agg: 1 };
}

async function fetchKlines(symbol: string, interval: string): Promise<Kline[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const fsym = toCC(symbol);
    const { ep, agg } = ccEndpoint(interval);
    const url = `https://min-api.cryptocompare.com/data/v2/${ep}?fsym=${fsym}&tsym=USD&limit=100&aggregate=${agg}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.Response !== "Success") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return json.Data.Data.map((k: any): Kline => ({
      time: k.time * 1000, open: k.open, high: k.high,
      low: k.low, close: k.close, volume: k.volumefrom,
    }));
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get("interval") || "1h";
  const filter   = searchParams.get("filter")   || "all";

  const results = [];
  const BATCH = 8;
  for (let i = 0; i < SCAN_SYMBOLS.length; i += BATCH) {
    const batch = await Promise.all(
      SCAN_SYMBOLS.slice(i, i + BATCH).map(async sym => {
        const k = await fetchKlines(sym, interval);
        return k ? scoredScanAnalysis(sym, k) : null;
      })
    );
    results.push(...batch.filter(Boolean));
  }

  type Item = NonNullable<ReturnType<typeof scoredScanAnalysis>>;
  const filtered = (results as Item[])
    .filter(r => filter === "all" || r.signal === filter)
    .sort((a, b) => b.strength - a.strength);

  return NextResponse.json({
    scannedAt: new Date().toISOString(),
    total: SCAN_SYMBOLS.length,
    found: filtered.length,
    interval,
    results: filtered,
  });
}

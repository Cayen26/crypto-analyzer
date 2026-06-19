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

function toOKX(s: string) { return s.replace("USDT", "") + "-USDT"; }
function toOKXBar(interval: string) {
  if (interval === "4h") return "4H";
  if (interval === "1d") return "1D";
  if (interval === "15m") return "15m";
  return "1H";
}

async function fetchKlines(symbol: string, interval: string): Promise<Kline[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://www.okx.com/api/v5/market/candles?instId=${toOKX(symbol)}&bar=${toOKXBar(interval)}&limit=100`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code !== "0") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data as any[]).reverse().map(k => ({
      time: parseInt(k[0]), open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
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

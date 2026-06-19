import { NextRequest, NextResponse } from "next/server";
import { scoredScanAnalysis } from "../../lib/analysis";

type RawKline = [number, string, string, string, string, string, ...unknown[]];

const SCAN_SYMBOLS = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","AVAXUSDT","DOGEUSDT",
  "DOTUSDT","MATICUSDT","LINKUSDT","UNIUSDT","LTCUSDT","ATOMUSDT","ETCUSDT","XLMUSDT",
  "ALGOUSDT","NEARUSDT","FTMUSDT","SANDUSDT","MANAUSDT","AXSUSDT","CRVUSDT","AAVEUSDT",
  "RUNEUSDT","KAVAUSDT","VETUSDT","HBARUSDT","EGLDUSDT","ICPUSDT","FILUSDT","FLOWUSDT",
  "THETAUSDT","XTZUSDT","BCHUSDT","TRXUSDT","ENJUSDT","CHZUSDT","GALAUSDT","APEUSDT",
  "LDOUSDT","OPUSDT","ARBUSDT","GMXUSDT","DYDXUSDT","IMXUSDT","RNDRUSDT","AGIXUSDT",
  "FETUSDT","WOOUSDT","SUIUSDT","APTUSDT","INJUSDT","SEIUSDT","TIAUSDT","WLDUSDT",
  "MAGICUSDT","PENDLEUSDT","ARKMUSDT","ORDIUSDT","JUPUSDT","DYMUSDT","STRKUSDT",
  "ENAUSDT","TAOUSDT","NOTUSDT","ZKUSDT","BOMEUSDT","MEWUSDT","POPCATUSDT","EIGENUSDT",
  "GOATUSDT","MOODENGUSDT","PNUTUSDT",
];

async function fetchKlines(symbol: string, interval: string, limit: number) {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const raw: RawKline[] = await res.json();
    return raw.map(k => ({
      time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
    }));
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get("interval") || "1h";
  const filter   = searchParams.get("filter")   || "all";

  const results = [];
  const BATCH = 10;
  for (let i = 0; i < SCAN_SYMBOLS.length; i += BATCH) {
    const batch = await Promise.all(
      SCAN_SYMBOLS.slice(i, i + BATCH).map(async sym => {
        const k = await fetchKlines(sym, interval, 100);
        return k ? scoredScanAnalysis(sym, k) : null;
      })
    );
    results.push(...batch.filter(Boolean));
  }

  const filtered = results
    .filter(r => filter === "all" || r!.signal === filter)
    .sort((a, b) => b!.strength - a!.strength);

  return NextResponse.json({
    scannedAt: new Date().toISOString(),
    total: SCAN_SYMBOLS.length,
    found: filtered.length,
    interval,
    results: filtered,
  });
}

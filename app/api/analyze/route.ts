import { NextRequest, NextResponse } from "next/server";
import { analyzeKlines, Kline } from "../../lib/analysis";

function toCC(symbol: string) {
  return symbol.replace(/USDT$/, "");
}

function ccEndpoint(interval: string): { ep: string; agg: number } {
  if (interval === "1d")  return { ep: "histoday",    agg: 1  };
  if (interval === "4h")  return { ep: "histohour",   agg: 4  };
  if (interval === "15m") return { ep: "histominute", agg: 15 };
  return { ep: "histohour", agg: 1 };
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
  const fsym = toCC(symbol);
  const { ep, agg } = ccEndpoint(interval);
  const url = `https://min-api.cryptocompare.com/data/v2/${ep}?fsym=${fsym}&tsym=USD&limit=${limit}&aggregate=${agg}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`CC HTTP ${res.status}`);
    const json = await res.json();
    if (json.Response !== "Success") throw new Error(json.Message || "CC error");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return json.Data.Data.map((k: any): Kline => ({
      time: k.time * 1000, open: k.open, high: k.high,
      low: k.low, close: k.close, volume: k.volumefrom,
    }));
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol   = searchParams.get("symbol")   || "BTCUSDT";
  const interval = searchParams.get("interval") || "1h";
  try {
    const [klines, klines1d] = await Promise.all([
      fetchKlines(symbol, interval, 100),
      fetchKlines(symbol, "1d", 30),
    ]);
    return NextResponse.json(analyzeKlines(symbol, klines, klines1d));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

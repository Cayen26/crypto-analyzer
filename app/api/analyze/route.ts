import { NextRequest, NextResponse } from "next/server";
import { analyzeKlines, Kline } from "../../lib/analysis";

// OKX: BTCUSDT → BTC-USDT, interval: 1h → 1H, 4h → 4H, 1d → 1D, 15m → 15m
function toOKX(symbol: string) {
  const base = symbol.replace("USDT", "");
  return `${base}-USDT`;
}
function toOKXBar(interval: string) {
  if (interval === "1h")  return "1H";
  if (interval === "4h")  return "4H";
  if (interval === "1d")  return "1D";
  if (interval === "15m") return "15m";
  return "1H";
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
  const instId = toOKX(symbol);
  const bar    = toOKXBar(interval);
  const url    = `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== "0") throw new Error(`OKX error: ${json.msg}`);
    // OKX: [ts, o, h, l, c, vol, ...]  — newest first, so reverse
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data as any[]).reverse().map(k => ({
      time:   parseInt(k[0]),
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5]),
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

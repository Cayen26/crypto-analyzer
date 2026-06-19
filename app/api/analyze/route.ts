import { NextRequest, NextResponse } from "next/server";
import { analyzeKlines } from "../../lib/analysis";

type RawKline = [number, string, string, string, string, string, ...unknown[]];

async function fetchKlines(symbol: string, interval: string, limit: number) {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`Binance ${res.status}`);
  const raw: RawKline[] = await res.json();
  return raw.map(k => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
  }));
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

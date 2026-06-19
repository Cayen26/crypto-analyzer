import { NextResponse } from "next/server";

export async function GET() {
  const url = "https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=1H&limit=3";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const json = await res.json();
    return NextResponse.json({ status: res.status, ok: res.ok, code: json.code, msg: json.msg, rows: json.data?.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}

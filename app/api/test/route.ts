import { NextResponse } from "next/server";

export async function GET() {
  const url = "https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=5&aggregate=1";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const text = await res.text();
    return NextResponse.json({ status: res.status, ok: res.ok, body: text.slice(0, 300) });
  } catch (e) {
    return NextResponse.json({ error: String(e), message: e instanceof Error ? e.message : "unknown" });
  }
}

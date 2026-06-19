import { NextRequest, NextResponse } from "next/server";

type Kline = [number, string, string, string, string, string, ...unknown[]];

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
  return res.json();
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emas: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    emas.push(values[i] * k + emas[i - 1] * (1 - k));
  }
  return emas;
}

function calcMACD(closes: number[]) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = calcEMA(macdLine.slice(26), 9);
  const last = macdLine[macdLine.length - 1];
  const lastSignal = signal[signal.length - 1];
  return { macd: last, signal: lastSignal, histogram: last - lastSignal };
}

function calcBB(closes: number[], period = 20) {
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std };
}

function findSupportResistance(highs: number[], lows: number[]) {
  const recent = 20;
  const recentHighs = highs.slice(-recent);
  const recentLows = lows.slice(-recent);
  return {
    resistance: Math.max(...recentHighs),
    support: Math.min(...recentLows),
  };
}

function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcTradePlan(
  signal: "AL" | "SAT" | "BEKLE",
  price: number,
  atr: number,
  support: number,
  resistance: number,
  bb: { upper: number; lower: number; middle: number }
) {
  if (signal === "BEKLE") return null;

  const isLong = signal === "AL";

  // Giriş: mevcut fiyat ± küçük ATR payı (limit order gibi)
  const entry = isLong
    ? parseFloat((price - atr * 0.1).toFixed(4))
    : parseFloat((price + atr * 0.1).toFixed(4));

  // SL: destek/direnç + 1 ATR tampon
  const sl = isLong
    ? parseFloat(Math.min(support - atr * 0.5, price - atr * 1.5).toFixed(4))
    : parseFloat(Math.max(resistance + atr * 0.5, price + atr * 1.5).toFixed(4));

  const riskAmount = Math.abs(entry - sl);

  // TP seviyeleri: 1:1.5, 1:2.5, 1:4 risk/ödül
  const tp1 = isLong
    ? parseFloat(Math.min(entry + riskAmount * 1.5, bb.upper).toFixed(4))
    : parseFloat(Math.max(entry - riskAmount * 1.5, bb.lower).toFixed(4));

  const tp2 = isLong
    ? parseFloat((entry + riskAmount * 2.5).toFixed(4))
    : parseFloat((entry - riskAmount * 2.5).toFixed(4));

  const tp3 = isLong
    ? parseFloat(Math.max(entry + riskAmount * 4, resistance).toFixed(4))
    : parseFloat(Math.min(entry - riskAmount * 4, support).toFixed(4));

  const riskPct = parseFloat((Math.abs(entry - sl) / entry * 100).toFixed(2));
  const rewardPct1 = parseFloat((Math.abs(tp1 - entry) / entry * 100).toFixed(2));
  const rewardPct2 = parseFloat((Math.abs(tp2 - entry) / entry * 100).toFixed(2));
  const rewardPct3 = parseFloat((Math.abs(tp3 - entry) / entry * 100).toFixed(2));

  return { entry, sl, tp1, tp2, tp3, riskPct, rewardPct1, rewardPct2, rewardPct3, rr1: parseFloat((rewardPct1 / riskPct).toFixed(2)) };
}

function generateSignal(
  rsi: number,
  macd: { histogram: number },
  price: number,
  bb: { upper: number; lower: number; middle: number },
  support: number,
  resistance: number
): { signal: "AL" | "SAT" | "BEKLE"; strength: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // RSI
  if (rsi < 30) { score += 2; reasons.push(`RSI aşırı satım bölgesinde (${rsi.toFixed(1)})`); }
  else if (rsi < 45) { score += 1; reasons.push(`RSI düşük seviyelerde (${rsi.toFixed(1)})`); }
  else if (rsi > 70) { score -= 2; reasons.push(`RSI aşırı alım bölgesinde (${rsi.toFixed(1)})`); }
  else if (rsi > 55) { score -= 1; reasons.push(`RSI yüksek seviyelerde (${rsi.toFixed(1)})`); }

  // MACD
  if (macd.histogram > 0) { score += 1; reasons.push("MACD pozitif momentum gösteriyor"); }
  else { score -= 1; reasons.push("MACD negatif momentum gösteriyor"); }

  // Bollinger Bands
  if (price < bb.lower) { score += 2; reasons.push("Fiyat alt Bollinger bandının altında"); }
  else if (price > bb.upper) { score -= 2; reasons.push("Fiyat üst Bollinger bandının üzerinde"); }
  else if (price < bb.middle) { score += 0.5; reasons.push("Fiyat Bollinger ortasının altında"); }

  // Support/Resistance
  const distToSupport = ((price - support) / price) * 100;
  const distToResistance = ((resistance - price) / price) * 100;
  if (distToSupport < 2) { score += 1.5; reasons.push(`Destek seviyesine yakın (%${distToSupport.toFixed(1)})`); }
  if (distToResistance < 2) { score -= 1.5; reasons.push(`Direnç seviyesine yakın (%${distToResistance.toFixed(1)})`); }

  const strength = Math.min(Math.abs(score) / 6, 1);

  if (score >= 2) return { signal: "AL", strength, reasons };
  if (score <= -2) return { signal: "SAT", strength, reasons };
  return { signal: "BEKLE", strength, reasons };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  const interval = searchParams.get("interval") || "1h";

  try {
    const [klines1h, klines1d] = await Promise.all([
      fetchKlines(symbol, interval, 100),
      fetchKlines(symbol, "1d", 30),
    ]);

    const closes = klines1h.map((k) => parseFloat(k[4]));
    const highs = klines1h.map((k) => parseFloat(k[2]));
    const lows = klines1h.map((k) => parseFloat(k[3]));
    const volumes = klines1h.map((k) => parseFloat(k[5]));

    const price = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const change24h = ((price - parseFloat(klines1d[klines1d.length - 2][1])) / parseFloat(klines1d[klines1d.length - 2][1])) * 100;

    const rsi = calcRSI(closes);
    const macd = calcMACD(closes);
    const bb = calcBB(closes);
    const { support, resistance } = findSupportResistance(highs, lows);
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    const { signal, strength, reasons } = generateSignal(rsi, macd, price, bb, support, resistance);

    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    const trend = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? "Yükseliş" : "Düşüş";

    const atr = calcATR(highs, lows, closes);
    const tradePlan = calcTradePlan(signal, price, atr, support, resistance, bb);

    return NextResponse.json({
      symbol,
      price,
      change24h,
      priceChange: price - prevClose,
      rsi: parseFloat(rsi.toFixed(2)),
      macd: {
        macd: parseFloat(macd.macd.toFixed(4)),
        signal: parseFloat(macd.signal.toFixed(4)),
        histogram: parseFloat(macd.histogram.toFixed(4)),
      },
      bollinger: {
        upper: parseFloat(bb.upper.toFixed(2)),
        middle: parseFloat(bb.middle.toFixed(2)),
        lower: parseFloat(bb.lower.toFixed(2)),
      },
      support: parseFloat(support.toFixed(2)),
      resistance: parseFloat(resistance.toFixed(2)),
      volume: currentVolume,
      volumeRatio: parseFloat(volumeRatio.toFixed(2)),
      trend,
      recommendation: {
        signal,
        strength: parseFloat((strength * 100).toFixed(1)),
        reasons,
      },
      tradePlan,
      atr: parseFloat(atr.toFixed(4)),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

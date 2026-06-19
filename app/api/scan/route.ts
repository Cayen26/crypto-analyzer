import { NextRequest, NextResponse } from "next/server";

type Kline = [number, string, string, string, string, string, ...unknown[]];

// Top coins + mid cap — toplam ~120 sembol
const SCAN_SYMBOLS = [
  // Majors
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","AVAXUSDT","DOGEUSDT",
  "DOTUSDT","MATICUSDT","LINKUSDT","UNIUSDT","LTCUSDT","ATOMUSDT","ETCUSDT","XLMUSDT",
  "ALGOUSDT","NEARUSDT","FTMUSDT","SANDUSDT","MANAUSDT","AXSUSDT","CRVUSDT","AAVEUSDT",
  "SNXUSDT","COMPUSDT","MKRUSDT","YFIUSDT","SUSHIUSDT","1INCHUSDT","RUNEUSDT","KAVAUSDT",
  "ZILUSDT","VETUSDT","HBARUSDT","EGLDUSDT","ICPUSDT","FILUSDT","FLOWUSDT","THETAUSDT",
  "XTZUSDT","EOSUSDT","BCHUSDT","TRXUSDT","XMRUSDT","DASHUSDT","ZECUSDT","ENJUSDT",
  "CHZUSDT","GALAUSDT","APEUSDT","LDOUSDT","OPUSDT","ARBUSDT","GMXUSDT","PERPUSDT",
  "DYDXUSDT","IMXUSDT","LRCUSDT","STGUSDT","COTIUSDT","OCEANUSDT","ANKRUSDT","BATUSDT",
  "STORJUSDT","SKLUSDT","BANDUSDT","RNDRUSDT","AGIXUSDT","FETUSDT","CFXUSDT","WOOUSDT",
  "SUIUSDT","APTUSDT","INJUSDT","SEIUSDT","TIAUSDT","WLDUSDT","BLURUSDT","JOEUSDT",
  "MAGICUSDT","PENDLEUSDT","CYBERUSDT","ARKMUSDT","GASUSDT","ORDIUSDT","SATSUSDT",
  "ACEUSDT","NFPUSDT","AIUSDT","XAIUSDT","MANTAUSDT","ALTUSDT","JUPUSDT","DYMUSDT",
  "PIXELUSDT","PORTALUSDT","PDAUSDT","METISUSDT","STRKUSDT","ZETAUSDT","ENAUSDT",
  "WUSDT","TNSRUSDT","SAGAUSDT","TAOUSDT","NOTUSDT","IOUSDT","ZKUSDT","LISTAUSDT",
  "BOMEUSDT","REZUSDT","BBUSDT","MEWUSDT","POPCATUSDT","DOGSUSDT","SUNTUSDT","EIGENUSDT",
  "SCRUSDT","HMSTRUSDT","REIUSDT","GOATUSDT","MOODENGUSDT","ACTUSDT","PNUTUSDT",
];

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Kline[] | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { next: { revalidate: 120 }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emas: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) emas.push(values[i] * k + emas[i - 1] * (1 - k));
  return emas;
}

function calcMACD(closes: number[]) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = calcEMA(macdLine.slice(26), 9);
  const last = macdLine[macdLine.length - 1];
  const lastSignal = signal[signal.length - 1];
  return { histogram: last - lastSignal, crossingUp: last > lastSignal && macdLine[macdLine.length - 2] <= ema26[ema26.length - 2] };
}

function calcBB(closes: number[], period = 20) {
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std };
}

function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function analyze(symbol: string, klines: Kline[]) {
  const closes = klines.map(k => parseFloat(k[4]));
  const highs  = klines.map(k => parseFloat(k[2]));
  const lows   = klines.map(k => parseFloat(k[3]));
  const volumes= klines.map(k => parseFloat(k[5]));

  if (closes.length < 50) return null;

  const price  = closes[closes.length - 1];
  const open24 = parseFloat(klines[klines.length - 24 < 0 ? 0 : klines.length - 24][1]);
  const change = ((price - open24) / open24) * 100;

  const rsi   = calcRSI(closes);
  const macd  = calcMACD(closes);
  const bb    = calcBB(closes);
  const atr   = calcATR(highs, lows, closes);

  const recentHighs = highs.slice(-20);
  const recentLows  = lows.slice(-20);
  const resistance  = Math.max(...recentHighs);
  const support     = Math.min(...recentLows);

  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const trend = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? "Yükseliş" : "Düşüş";

  const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio = volumes[volumes.length - 1] / avgVol;

  let score = 0;
  const reasons: string[] = [];

  // RSI
  if (rsi < 30)      { score += 3; reasons.push(`RSI aşırı satım: ${rsi.toFixed(1)}`); }
  else if (rsi < 40) { score += 2; reasons.push(`RSI düşük: ${rsi.toFixed(1)}`); }
  else if (rsi > 70) { score -= 3; reasons.push(`RSI aşırı alım: ${rsi.toFixed(1)}`); }
  else if (rsi > 60) { score -= 2; reasons.push(`RSI yüksek: ${rsi.toFixed(1)}`); }

  // MACD
  if (macd.histogram > 0) { score += 1; reasons.push("MACD pozitif"); }
  else                    { score -= 1; reasons.push("MACD negatif"); }
  if (macd.crossingUp)    { score += 2; reasons.push("MACD kesişim yukarı"); }

  // BB
  if (price < bb.lower)  { score += 2; reasons.push("BB alt bandı kırıldı"); }
  else if (price > bb.upper) { score -= 2; reasons.push("BB üst bandı kırıldı"); }

  // Hacim spike
  if (volRatio > 2)   { score += Math.sign(score) * 1.5; reasons.push(`Hacim spike: ${volRatio.toFixed(1)}x`); }

  // Trend
  if (trend === "Yükseliş") { score += 0.5; }
  else                       { score -= 0.5; }

  // Destek/direnç
  const distToSupport    = ((price - support) / price) * 100;
  const distToResistance = ((resistance - price) / price) * 100;
  if (distToSupport < 1.5)    { score += 1.5; reasons.push(`Destek'e yakın: %${distToSupport.toFixed(1)}`); }
  if (distToResistance < 1.5) { score -= 1.5; reasons.push(`Direnç'e yakın: %${distToResistance.toFixed(1)}`); }

  const absScore = Math.abs(score);
  if (absScore < 3) return null; // zayıf sinyalleri filtrele

  const signal: "AL" | "SAT" = score > 0 ? "AL" : "SAT";
  const strength = Math.min((absScore / 8) * 100, 100);

  // Trade plan
  const isLong = signal === "AL";
  const entry = isLong ? price - atr * 0.1 : price + atr * 0.1;
  const sl    = isLong
    ? Math.min(support - atr * 0.5, price - atr * 1.5)
    : Math.max(resistance + atr * 0.5, price + atr * 1.5);
  const risk  = Math.abs(entry - sl);
  const tp1   = isLong ? Math.min(entry + risk * 1.5, bb.upper) : Math.max(entry - risk * 1.5, bb.lower);
  const tp2   = isLong ? entry + risk * 2.5 : entry - risk * 2.5;
  const tp3   = isLong ? Math.max(entry + risk * 4, resistance) : Math.min(entry - risk * 4, support);

  const riskPct   = parseFloat((Math.abs(entry - sl) / entry * 100).toFixed(2));
  const rr        = parseFloat((Math.abs(tp1 - entry) / Math.abs(entry - sl)).toFixed(2));

  return {
    symbol,
    price,
    change,
    rsi: parseFloat(rsi.toFixed(1)),
    signal,
    strength: parseFloat(strength.toFixed(1)),
    trend,
    volRatio: parseFloat(volRatio.toFixed(2)),
    reasons,
    tradePlan: {
      entry: parseFloat(entry.toFixed(6)),
      sl:    parseFloat(sl.toFixed(6)),
      tp1:   parseFloat(tp1.toFixed(6)),
      tp2:   parseFloat(tp2.toFixed(6)),
      tp3:   parseFloat(tp3.toFixed(6)),
      riskPct,
      rr,
    },
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const interval = searchParams.get("interval") || "1h";
  const filter   = searchParams.get("filter") || "all"; // "AL" | "SAT" | "all"

  // Paralel fetch — 10'arlı gruplar halinde (rate limit önlemi)
  const results = [];
  const BATCH = 15;

  for (let i = 0; i < SCAN_SYMBOLS.length; i += BATCH) {
    const batch = SCAN_SYMBOLS.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map(async (sym) => {
        const klines = await fetchKlines(sym, interval, 100);
        if (!klines || klines.length < 50) return null;
        return analyze(sym, klines);
      })
    );
    results.push(...fetched.filter(Boolean));
  }

  let filtered = results as NonNullable<ReturnType<typeof analyze>>[];
  if (filter === "AL")  filtered = filtered.filter(r => r.signal === "AL");
  if (filter === "SAT") filtered = filtered.filter(r => r.signal === "SAT");

  // Sinyal gücüne göre sırala
  filtered.sort((a, b) => b.strength - a.strength);

  return NextResponse.json({
    scannedAt: new Date().toISOString(),
    total: SCAN_SYMBOLS.length,
    found: filtered.length,
    interval,
    results: filtered,
  });
}

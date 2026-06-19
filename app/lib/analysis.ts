export type Kline = { time: number; open: number; high: number; low: number; close: number; volume: number };

export type Signal = "AL" | "SAT" | "BEKLE";

export interface TradePlan {
  entry: number; sl: number; tp1: number; tp2: number; tp3: number;
  riskPct: number; rewardPct1: number; rewardPct2: number; rewardPct3: number; rr: number;
}

export interface AnalysisResult {
  symbol: string; price: number; change24h: number; rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  bollinger: { upper: number; middle: number; lower: number };
  support: number; resistance: number; volumeRatio: number; trend: string; atr: number;
  recommendation: { signal: Signal; strength: number; reasons: string[] };
  tradePlan: TradePlan | null;
  updatedAt: string;
}

export interface ScanItem {
  symbol: string; price: number; change: number; rsi: number;
  signal: "AL" | "SAT"; strength: number; trend: string; volRatio: number;
  reasons: string[]; tradePlan: TradePlan;
}

// Binance kline fetch — tarayıcıdan direkt çağrılır
export async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Binance API ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await res.json();
  return raw.map(k => ({
    time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
  }));
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const avgGain = gains / period, avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function calcEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k));
  return out;
}

function calcMACD(closes: number[]) {
  const ema12 = calcEMA(closes, 12), ema26 = calcEMA(closes, 26);
  const line = ema12.map((v, i) => v - ema26[i]);
  const sig = calcEMA(line.slice(26), 9);
  const last = line[line.length - 1], lastSig = sig[sig.length - 1];
  return { macd: last, signal: lastSig, histogram: last - lastSig };
}

function calcBB(closes: number[], period = 20) {
  const sl = closes.slice(-period);
  const mean = sl.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(sl.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  return { upper: mean + 2 * std, middle: mean, lower: mean - 2 * std };
}

function calcATR(klines: Kline[], period = 14): number {
  const trs = klines.slice(1).map((k, i) =>
    Math.max(k.high - k.low, Math.abs(k.high - klines[i].close), Math.abs(k.low - klines[i].close))
  );
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function buildTradePlan(signal: "AL" | "SAT", price: number, atr: number, support: number, resistance: number, bb: { upper: number; lower: number }): TradePlan {
  const isLong = signal === "AL";
  const entry = isLong ? price - atr * 0.1 : price + atr * 0.1;
  const sl = isLong
    ? Math.min(support - atr * 0.5, price - atr * 1.5)
    : Math.max(resistance + atr * 0.5, price + atr * 1.5);
  const risk = Math.abs(entry - sl);
  const tp1 = isLong ? Math.min(entry + risk * 1.5, bb.upper) : Math.max(entry - risk * 1.5, bb.lower);
  const tp2 = isLong ? entry + risk * 2.5 : entry - risk * 2.5;
  const tp3 = isLong ? Math.max(entry + risk * 4, resistance) : Math.min(entry - risk * 4, support);
  const riskPct = parseFloat((Math.abs(entry - sl) / entry * 100).toFixed(2));
  const rr = parseFloat((Math.abs(tp1 - entry) / risk).toFixed(2));
  return {
    entry: parseFloat(entry.toFixed(6)), sl: parseFloat(sl.toFixed(6)),
    tp1: parseFloat(tp1.toFixed(6)), tp2: parseFloat(tp2.toFixed(6)), tp3: parseFloat(tp3.toFixed(6)),
    riskPct, rewardPct1: parseFloat((Math.abs(tp1 - entry) / entry * 100).toFixed(2)),
    rewardPct2: parseFloat((Math.abs(tp2 - entry) / entry * 100).toFixed(2)),
    rewardPct3: parseFloat((Math.abs(tp3 - entry) / entry * 100).toFixed(2)), rr,
  };
}

export function analyzeKlines(symbol: string, klines: Kline[], klines1d: Kline[]): AnalysisResult {
  const closes  = klines.map(k => k.close);
  const highs   = klines.map(k => k.high);
  const lows    = klines.map(k => k.low);
  const volumes = klines.map(k => k.volume);

  const price    = closes[closes.length - 1];
  const open24   = klines1d.length >= 2 ? klines1d[klines1d.length - 2].open : closes[0];
  const change24h = ((price - open24) / open24) * 100;

  const rsi  = calcRSI(closes);
  const macd = calcMACD(closes);
  const bb   = calcBB(closes);
  const atr  = calcATR(klines);

  const support    = Math.min(...lows.slice(-20));
  const resistance = Math.max(...highs.slice(-20));

  const ema20 = calcEMA(closes, 20), ema50 = calcEMA(closes, 50);
  const trend = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? "Yükseliş" : "Düşüş";

  const avgVol   = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio = volumes[volumes.length - 1] / avgVol;

  let score = 0;
  const reasons: string[] = [];

  if (rsi < 30)      { score += 2; reasons.push(`RSI aşırı satım bölgesinde (${rsi.toFixed(1)})`); }
  else if (rsi < 45) { score += 1; reasons.push(`RSI düşük seviyelerde (${rsi.toFixed(1)})`); }
  else if (rsi > 70) { score -= 2; reasons.push(`RSI aşırı alım bölgesinde (${rsi.toFixed(1)})`); }
  else if (rsi > 55) { score -= 1; reasons.push(`RSI yüksek seviyelerde (${rsi.toFixed(1)})`); }

  if (macd.histogram > 0) { score += 1; reasons.push("MACD pozitif momentum gösteriyor"); }
  else                    { score -= 1; reasons.push("MACD negatif momentum gösteriyor"); }

  if (price < bb.lower)       { score += 2; reasons.push("Fiyat alt Bollinger bandının altında"); }
  else if (price > bb.upper)  { score -= 2; reasons.push("Fiyat üst Bollinger bandının üzerinde"); }
  else if (price < bb.middle) { score += 0.5; }

  const dts = ((price - support)    / price) * 100;
  const dtr = ((resistance - price) / price) * 100;
  if (dts < 2) { score += 1.5; reasons.push(`Destek seviyesine yakın (%${dts.toFixed(1)})`); }
  if (dtr < 2) { score -= 1.5; reasons.push(`Direnç seviyesine yakın (%${dtr.toFixed(1)})`); }

  const strength = Math.min(Math.abs(score) / 6, 1);
  const signal: Signal = score >= 2 ? "AL" : score <= -2 ? "SAT" : "BEKLE";

  const tradePlan = signal !== "BEKLE"
    ? buildTradePlan(signal, price, atr, support, resistance, bb)
    : null;

  const p = (n: number, d = 2) => parseFloat(n.toFixed(d));
  return {
    symbol, price, change24h: p(change24h),
    rsi: p(rsi), macd: { macd: p(macd.macd, 4), signal: p(macd.signal, 4), histogram: p(macd.histogram, 4) },
    bollinger: { upper: p(bb.upper), middle: p(bb.middle), lower: p(bb.lower) },
    support: p(support), resistance: p(resistance),
    volumeRatio: p(volRatio), trend, atr: p(atr, 4),
    recommendation: { signal, strength: p(strength * 100, 1), reasons },
    tradePlan, updatedAt: new Date().toISOString(),
  };
}

export function scoredScanAnalysis(symbol: string, klines: Kline[]): ScanItem | null {
  if (klines.length < 50) return null;
  const closes  = klines.map(k => k.close);
  const highs   = klines.map(k => k.high);
  const lows    = klines.map(k => k.low);
  const volumes = klines.map(k => k.volume);

  const price  = closes[closes.length - 1];
  const open24 = closes[closes.length - 25] ?? closes[0];
  const change = ((price - open24) / open24) * 100;

  const rsi  = calcRSI(closes);
  const macd = calcMACD(closes);
  const bb   = calcBB(closes);
  const atr  = calcATR(klines);

  const support    = Math.min(...lows.slice(-20));
  const resistance = Math.max(...highs.slice(-20));

  const ema20 = calcEMA(closes, 20), ema50 = calcEMA(closes, 50);
  const trend = ema20[ema20.length - 1] > ema50[ema50.length - 1] ? "Yükseliş" : "Düşüş";

  const avgVol   = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio = volumes[volumes.length - 1] / avgVol;

  let score = 0;
  const reasons: string[] = [];

  if (rsi < 30)      { score += 3; reasons.push(`RSI aşırı satım: ${rsi.toFixed(1)}`); }
  else if (rsi < 40) { score += 2; reasons.push(`RSI düşük: ${rsi.toFixed(1)}`); }
  else if (rsi > 70) { score -= 3; reasons.push(`RSI aşırı alım: ${rsi.toFixed(1)}`); }
  else if (rsi > 60) { score -= 2; reasons.push(`RSI yüksek: ${rsi.toFixed(1)}`); }

  if (macd.histogram > 0) { score += 1; reasons.push("MACD pozitif"); }
  else                    { score -= 1; reasons.push("MACD negatif"); }

  if (price < bb.lower)      { score += 2; reasons.push("BB alt bandı kırıldı"); }
  else if (price > bb.upper) { score -= 2; reasons.push("BB üst bandı kırıldı"); }

  if (volRatio > 2) { score += Math.sign(score) * 1.5; reasons.push(`Hacim spike: ${volRatio.toFixed(1)}x`); }

  const dts = ((price - support)    / price) * 100;
  const dtr = ((resistance - price) / price) * 100;
  if (dts < 1.5) { score += 1.5; reasons.push(`Destek'e yakın: %${dts.toFixed(1)}`); }
  if (dtr < 1.5) { score -= 1.5; reasons.push(`Direnç'e yakın: %${dtr.toFixed(1)}`); }

  if (Math.abs(score) < 3) return null;

  const signal: "AL" | "SAT" = score > 0 ? "AL" : "SAT";
  const strength = parseFloat(Math.min((Math.abs(score) / 8) * 100, 100).toFixed(1));
  const tradePlan = buildTradePlan(signal, price, atr, support, resistance, bb);

  return { symbol, price, change: parseFloat(change.toFixed(2)), rsi: parseFloat(rsi.toFixed(1)), signal, strength, trend, volRatio: parseFloat(volRatio.toFixed(2)), reasons, tradePlan };
}

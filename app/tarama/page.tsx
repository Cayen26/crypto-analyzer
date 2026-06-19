"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type TradePlan = {
  entry: number; sl: number; tp1: number; tp2: number; tp3: number;
  riskPct: number; rr: number;
};

type ScanResult = {
  symbol: string; price: number; change: number; rsi: number;
  signal: "AL" | "SAT"; strength: number; trend: string; volRatio: number;
  reasons: string[]; tradePlan: TradePlan;
};

type ScanData = {
  scannedAt: string; total: number; found: number; interval: string;
  results: ScanResult[];
};

const INTERVALS = [
  { label: "15 Dakika", value: "15m" },
  { label: "1 Saat", value: "1h" },
  { label: "4 Saat", value: "4h" },
  { label: "1 Gün", value: "1d" },
];

const fp = (n: number) =>
  n >= 1000 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}` :
  n >= 1    ? `$${n.toFixed(4)}` : `$${n.toFixed(6)}`;

function StrengthBar({ value, signal }: { value: number; signal: "AL" | "SAT" }) {
  const color = signal === "AL" ? "#10b981" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: "#1e2d40", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color, width: 36, textAlign: "right", fontWeight: 700 }}>%{value}</span>
    </div>
  );
}

function CoinCard({ r, expanded, onToggle }: { r: ScanResult; expanded: boolean; onToggle: () => void }) {
  const isLong = r.signal === "AL";
  const sigColor = isLong ? "#10b981" : "#ef4444";
  const sigBg    = isLong ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)";
  const sigBorder= isLong ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)";
  const ticker   = r.symbol.replace("USDT", "");

  return (
    <div style={{ background: "#0f1623", border: `1px solid ${expanded ? sigBorder : "#1e2d40"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
      {/* Header row */}
      <div
        onClick={onToggle}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
      >
        {/* Ticker */}
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#1a2235", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#e2e8f0" }}>{ticker.slice(0,4)}</span>
        </div>

        {/* Name + price */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{ticker}</span>
            <span style={{ fontSize: 11, color: "#8899aa" }}>{fp(r.price)}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <StrengthBar value={r.strength} signal={r.signal} />
          </div>
        </div>

        {/* Signal badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <div style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 800, background: sigBg, color: sigColor, border: `1px solid ${sigBorder}` }}>
            {r.signal} {isLong ? "▲" : "▼"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, color: r.change >= 0 ? "#10b981" : "#ef4444" }}>
              {r.change >= 0 ? "+" : ""}{r.change.toFixed(2)}%
            </span>
            <span style={{ fontSize: 10, color: "#8899aa" }}>RSI {r.rsi}</span>
          </div>
        </div>

        <span style={{ color: "#8899aa", fontSize: 12, marginLeft: 4 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid #1e2d40", padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {/* Trade Plan */}
            <div style={{ gridColumn: "1 / -1", background: "#111827", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#8899aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>İşlem Planı</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {/* TP3 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 3, height: 12, background: "#10b981", opacity: 0.5, borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "#8899aa" }}>TP 3</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#10b981", opacity: 0.6 }}>
                      {isLong ? "+" : "-"}{(Math.abs(r.tradePlan.tp3 - r.tradePlan.entry) / r.tradePlan.entry * 100).toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981", opacity: 0.6 }}>{fp(r.tradePlan.tp3)}</span>
                  </div>
                </div>
                {/* TP2 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 3, height: 12, background: "#10b981", opacity: 0.7, borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "#8899aa" }}>TP 2</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#10b981", opacity: 0.8 }}>
                      {isLong ? "+" : "-"}{(Math.abs(r.tradePlan.tp2 - r.tradePlan.entry) / r.tradePlan.entry * 100).toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981", opacity: 0.8 }}>{fp(r.tradePlan.tp2)}</span>
                  </div>
                </div>
                {/* TP1 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 3, height: 12, background: "#10b981", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "#8899aa" }}>TP 1</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#10b981" }}>
                      {isLong ? "+" : "-"}{(Math.abs(r.tradePlan.tp1 - r.tradePlan.entry) / r.tradePlan.entry * 100).toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>{fp(r.tradePlan.tp1)}</span>
                  </div>
                </div>

                {/* Entry */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(59,130,246,0.1)", borderRadius: 6, padding: "6px 8px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>GİRİŞ</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6" }}>{fp(r.tradePlan.entry)}</span>
                </div>

                {/* SL */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 3, height: 12, background: "#ef4444", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "#8899aa" }}>STOP LOSS</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#ef4444" }}>-{r.tradePlan.riskPct}%</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>{fp(r.tradePlan.sl)}</span>
                  </div>
                </div>
              </div>

              {/* Risk/Reward */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7, padding: "6px 10px" }}>
                  <div style={{ fontSize: 10, color: "#8899aa" }}>Risk</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>%{r.tradePlan.riskPct}</div>
                </div>
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 7, padding: "6px 10px" }}>
                  <div style={{ fontSize: 10, color: "#8899aa" }}>R/R Oranı</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>1 : {r.tradePlan.rr}</div>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, color: "#8899aa" }}>Trend</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: r.trend === "Yükseliş" ? "#10b981" : "#ef4444" }}>{r.trend} {r.trend === "Yükseliş" ? "↑" : "↓"}</div>
              <div style={{ fontSize: 10, color: "#8899aa", marginTop: 4 }}>Hacim</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: r.volRatio > 1.5 ? "#f59e0b" : "#8899aa" }}>{r.volRatio}x ort.</div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: "#8899aa", marginBottom: 6 }}>Gerekçeler</div>
              {r.reasons.map((reason, i) => (
                <div key={i} style={{ display: "flex", gap: 5, marginBottom: 4 }}>
                  <span style={{ color: sigColor, flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.4 }}>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/?symbol=${r.symbol}`}
            style={{ display: "block", textAlign: "center", padding: "8px", background: "#1a2235", borderRadius: 8, fontSize: 12, color: "#3b82f6", textDecoration: "none", fontWeight: 600 }}
          >
            Grafikte Gör →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function TaramaPage() {
  const [interval, setInterval] = useState("1h");
  const [filter, setFilter]     = useState<"all" | "AL" | "SAT">("all");
  const [data, setData]         = useState<ScanData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [minStrength, setMinStrength] = useState(40);

  const scan = useCallback(async () => {
    setLoading(true);
    setData(null);
    setProgress(0);

    // Sahte progress bar
    const iv = window.setInterval(() => setProgress(p => Math.min(p + 3, 92)), 400);

    try {
      const res = await fetch(`/api/scan?interval=${interval}&filter=${filter}`);
      const json = await res.json();
      setData(json);
      setProgress(100);
    } finally {
      window.clearInterval(iv);
      setLoading(false);
    }
  }, [interval, filter]);

  useEffect(() => { scan(); }, [scan]);

  const displayed = data?.results.filter(r => r.strength >= minStrength) ?? [];
  const alCount   = displayed.filter(r => r.signal === "AL").length;
  const satCount  = displayed.filter(r => r.signal === "SAT").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a" }}>
      {/* Header */}
      <header style={{ background: "#0f1623", borderBottom: "1px solid #1e2d40", padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>C</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>CryptoAnalyzer</span>
        </Link>
        <div style={{ width: 1, height: 24, background: "#1e2d40" }} />
        <span style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>Kripto Tarayıcı</span>
        <Link href="/" style={{ marginLeft: "auto", fontSize: 11, color: "#8899aa", textDecoration: "none" }}>← Grafiğe Dön</Link>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        {/* Controls */}
        <div style={{ background: "#0f1623", border: "1px solid #1e2d40", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#8899aa", marginBottom: 6 }}>Zaman Dilimi</div>
              <div style={{ display: "flex", gap: 4 }}>
                {INTERVALS.map(iv => (
                  <button key={iv.value} onClick={() => setInterval(iv.value)} style={{
                    padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                    background: interval === iv.value ? "#3b82f6" : "#1a2235",
                    color: interval === iv.value ? "#fff" : "#8899aa",
                  }}>{iv.label}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#8899aa", marginBottom: 6 }}>Sinyal Filtresi</div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["all","AL","SAT"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                    background: filter === f ? (f === "AL" ? "#10b981" : f === "SAT" ? "#ef4444" : "#3b82f6") : "#1a2235",
                    color: filter === f ? "#fff" : "#8899aa",
                  }}>{f === "all" ? "Tümü" : f}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#8899aa", marginBottom: 6 }}>Min. Güç: %{minStrength}</div>
              <input type="range" min={20} max={80} value={minStrength} onChange={e => setMinStrength(+e.target.value)}
                style={{ accentColor: "#3b82f6", width: 120 }} />
            </div>

            <button onClick={scan} disabled={loading} style={{
              marginLeft: "auto", padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: loading ? "#1a2235" : "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700,
            }}>{loading ? "Taranıyor..." : "↻ Yeniden Tara"}</button>
          </div>
        </div>

        {/* Progress bar */}
        {loading && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#8899aa" }}>~{Math.round(120 * progress / 100)} sembol tarandı...</span>
              <span style={{ fontSize: 12, color: "#3b82f6" }}>%{progress}</span>
            </div>
            <div style={{ height: 4, background: "#1e2d40", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#3b82f6,#8b5cf6)", borderRadius: 2, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Stats bar */}
        {data && !loading && (
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "Taranan", value: data.total, color: "#8899aa" },
              { label: "Bulunan", value: data.found, color: "#3b82f6" },
              { label: "AL Sinyali", value: alCount, color: "#10b981" },
              { label: "SAT Sinyali", value: satCount, color: "#ef4444" },
            ].map(s => (
              <div key={s.label} style={{ background: "#0f1623", border: "1px solid #1e2d40", borderRadius: 8, padding: "10px 16px", flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, color: "#8899aa", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
            <div style={{ background: "#0f1623", border: "1px solid #1e2d40", borderRadius: 8, padding: "10px 16px", flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: "#8899aa", marginBottom: 2 }}>Son Tarama</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{new Date(data.scannedAt).toLocaleTimeString("tr-TR")}</div>
            </div>
          </div>
        )}

        {/* Results */}
        {displayed.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#8899aa" }}>
            {data ? "Kriterlere uyan kripto bulunamadı." : "Tarama başlatılıyor..."}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {displayed.map(r => (
            <CoinCard
              key={r.symbol}
              r={r}
              expanded={expanded === r.symbol}
              onToggle={() => setExpanded(expanded === r.symbol ? null : r.symbol)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

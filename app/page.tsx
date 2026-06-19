"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import AnalysisPanel from "./components/AnalysisPanel";
import { AnalysisResult } from "./lib/analysis";

const TradingViewWidget = dynamic(() => import("./components/TradingViewWidget"), { ssr: false });

const SYMBOLS = [
  { label: "BTC", value: "BTCUSDT" },
  { label: "ETH", value: "ETHUSDT" },
  { label: "BNB", value: "BNBUSDT" },
  { label: "SOL", value: "SOLUSDT" },
  { label: "XRP", value: "XRPUSDT" },
  { label: "DOGE", value: "DOGEUSDT" },
  { label: "ADA", value: "ADAUSDT" },
  { label: "AVAX", value: "AVAXUSDT" },
];

const INTERVALS = [
  { label: "15D", value: "15m" },
  { label: "1S", value: "1h" },
  { label: "4S", value: "4h" },
  { label: "1G", value: "1d" },
];

export default function Home() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1h");
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyze?symbol=${symbol}&interval=${interval}`);
      if (!res.ok) throw new Error(`API hatası: ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(fetchAnalysis, 60000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchAnalysis]);

  const signalColor = data?.recommendation.signal === "AL" ? "#10b981"
    : data?.recommendation.signal === "SAT" ? "#ef4444" : "#f59e0b";

  const formatPrice = (n: number) =>
    n > 1000 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : `$${n.toFixed(4)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0e1a" }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "0 16px", height: 52,
        background: "#0f1623", borderBottom: "1px solid #1e2d40", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>C</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>CryptoAnalyzer</span>
        </div>
        <div style={{ width: 1, height: 24, background: "#1e2d40" }} />

        <div style={{ display: "flex", gap: 3 }}>
          {SYMBOLS.map(s => (
            <button key={s.value} onClick={() => setSymbol(s.value)} style={{
              padding: "3px 9px", borderRadius: 5, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 600,
              background: symbol === s.value ? "#3b82f6" : "#1a2235",
              color: symbol === s.value ? "#fff" : "#8899aa",
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: "#1e2d40" }} />

        <div style={{ display: "flex", gap: 3 }}>
          {INTERVALS.map(iv => (
            <button key={iv.value} onClick={() => setInterval(iv.value)} style={{
              padding: "3px 9px", borderRadius: 5, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 600,
              background: interval === iv.value ? "#1e2d40" : "transparent",
              color: interval === iv.value ? "#e2e8f0" : "#8899aa",
            }}>{iv.label}</button>
          ))}
        </div>

        <Link href="/tarama" style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
          background: "rgba(139,92,246,0.15)", color: "#a78bfa",
          border: "1px solid rgba(139,92,246,0.3)", textDecoration: "none",
        }}>⚡ Tarayıcı</Link>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {data && (
            <>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{formatPrice(data.price)}</div>
                <div style={{ fontSize: 10, color: data.change24h >= 0 ? "#10b981" : "#ef4444" }}>
                  {data.change24h >= 0 ? "+" : ""}{data.change24h.toFixed(2)}%
                </div>
              </div>
              <div style={{ padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: `${signalColor}22`, color: signalColor, border: `1px solid ${signalColor}44` }}>
                {data.recommendation.signal}
              </div>
            </>
          )}
          <button onClick={fetchAnalysis} disabled={loading} style={{
            padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
            background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 600, opacity: loading ? 0.6 : 1,
          }}>{loading ? "..." : "↻ Yenile"}</button>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8899aa", cursor: "pointer" }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: "#3b82f6" }} />
            Oto
          </label>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TradingViewWidget symbol={symbol} interval={interval} />
        </div>
        <div style={{ width: 290, flexShrink: 0, borderLeft: "1px solid #1e2d40", background: "#0f1623", overflowY: "auto" }}>
          <AnalysisPanel data={data} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}

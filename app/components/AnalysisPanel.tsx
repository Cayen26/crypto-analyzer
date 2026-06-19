"use client";

interface TradePlan {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskPct: number;
  rewardPct1: number;
  rewardPct2: number;
  rewardPct3: number;
  rr1: number;
}

interface AnalysisData {
  symbol: string;
  price: number;
  change24h: number;
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  bollinger: { upper: number; middle: number; lower: number };
  support: number;
  tradePlan: TradePlan | null;
  resistance: number;
  volume: number;
  volumeRatio: number;
  trend: string;
  recommendation: { signal: "AL" | "SAT" | "BEKLE"; strength: number; reasons: string[] };
  updatedAt: string;
}

interface Props {
  data: AnalysisData | null;
  loading: boolean;
  error: string | null;
}

function SignalBadge({ signal }: { signal: "AL" | "SAT" | "BEKLE" }) {
  const config = {
    AL: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", color: "#10b981", emoji: "▲" },
    SAT: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", color: "#ef4444", emoji: "▼" },
    BEKLE: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", color: "#f59e0b", emoji: "●" },
  }[signal];

  return (
    <div
      style={{
        background: config.bg,
        border: `2px solid ${config.border}`,
        color: config.color,
        borderRadius: 16,
        padding: "18px 32px",
        textAlign: "center",
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 2 }}>
        {config.emoji} {signal}
      </div>
    </div>
  );
}

function MeterBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: "#1e2d40", overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min((value / max) * 100, 100)}%`,
          height: "100%",
          borderRadius: 3,
          background: color,
          transition: "width 0.8s ease",
        }}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#8899aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#8899aa" }}>{sub}</div>}
    </div>
  );
}

function RSIGauge({ value }: { value: number }) {
  const color = value < 30 ? "#10b981" : value > 70 ? "#ef4444" : "#f59e0b";
  const label = value < 30 ? "Aşırı Satım" : value > 70 ? "Aşırı Alım" : "Nötr";
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#8899aa" }}>RSI (14)</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value} — {label}</span>
      </div>
      <MeterBar value={value} max={100} color={color} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 10, color: "#8899aa" }}>0</span>
        <span style={{ fontSize: 10, color: "#10b981" }}>30</span>
        <span style={{ fontSize: 10, color: "#8899aa" }}>50</span>
        <span style={{ fontSize: 10, color: "#ef4444" }}>70</span>
        <span style={{ fontSize: 10, color: "#8899aa" }}>100</span>
      </div>
    </div>
  );
}

export default function AnalysisPanel({ data, loading, error }: Props) {
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#8899aa" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8, animation: "spin 1s linear infinite" }}>⟳</div>
          <div>Analiz hesaplanıyor...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "#ef4444" }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Hata</div>
        <div style={{ fontSize: 13 }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { recommendation, rsi, macd, bollinger, support, resistance, volumeRatio, trend, price, change24h, tradePlan } = data;

  const formatPrice = (n: number) =>
    n > 1000 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : `$${n.toFixed(4)}`;

  return (
    <div style={{ padding: "16px", overflowY: "auto", height: "100%" }}>
      {/* Signal */}
      <SignalBadge signal={recommendation.signal} />

      {/* Strength */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "#8899aa" }}>Sinyal Gücü</span>
          <span style={{ fontSize: 12, color: "#e2e8f0" }}>%{recommendation.strength}</span>
        </div>
        <MeterBar
          value={recommendation.strength}
          max={100}
          color={recommendation.signal === "AL" ? "#10b981" : recommendation.signal === "SAT" ? "#ef4444" : "#f59e0b"}
        />
      </div>

      {/* Reasons */}
      <div style={{ marginBottom: 16, background: "#111827", borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 11, color: "#8899aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Analiz Gerekçeleri</div>
        {recommendation.reasons.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
            <span style={{ color: recommendation.signal === "AL" ? "#10b981" : recommendation.signal === "SAT" ? "#ef4444" : "#f59e0b", marginTop: 1, flexShrink: 0 }}>•</span>
            <span style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.4 }}>{r}</span>
          </div>
        ))}
      </div>

      {/* RSI */}
      <RSIGauge value={rsi} />

      <div style={{ borderTop: "1px solid #1e2d40", paddingTop: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#8899aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>İndikatörler</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Stat label="MACD" value={macd.macd.toFixed(4)} sub={`Sinyal: ${macd.signal.toFixed(4)}`} />
          <Stat label="Histogram" value={macd.histogram > 0 ? `+${macd.histogram.toFixed(4)}` : macd.histogram.toFixed(4)} />
          <Stat label="BB Üst" value={formatPrice(bollinger.upper)} />
          <Stat label="BB Alt" value={formatPrice(bollinger.lower)} />
          <Stat label="Trend" value={trend} sub={change24h >= 0 ? `+${change24h.toFixed(2)}% (24s)` : `${change24h.toFixed(2)}% (24s)`} />
          <Stat label="Hacim Ort." value={`${volumeRatio.toFixed(2)}x`} sub={volumeRatio > 1.5 ? "Yüksek hacim" : "Normal"} />
        </div>
      </div>

      {/* Support / Resistance */}
      <div style={{ background: "#111827", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#8899aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Destek & Direnç</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#8899aa" }}>Direnç</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginLeft: "auto" }}>{formatPrice(resistance)}</span>
        </div>
        <div style={{ position: "relative", height: 24, background: "#1e2d40", borderRadius: 4, marginBottom: 6, display: "flex", alignItems: "center" }}>
          {resistance > support && (
            <div
              style={{
                position: "absolute",
                left: `${Math.max(0, Math.min(((price - support) / (resistance - support)) * 100, 100))}%`,
                width: 3,
                height: "100%",
                background: "#3b82f6",
                borderRadius: 2,
                transform: "translateX(-50%)",
              }}
            />
          )}
          <span style={{ fontSize: 10, color: "#8899aa", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            {formatPrice(price)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#8899aa" }}>Destek</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginLeft: "auto" }}>{formatPrice(support)}</span>
        </div>
      </div>

      {/* Trade Plan */}
      {tradePlan ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#8899aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
            İşlem Planı
          </div>

          {/* Entry */}
          <div style={{ background: "#111827", borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: "#8899aa" }}>GİRİŞ NOKTASI</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>{formatPrice(tradePlan.entry)}</span>
            </div>

            {/* TP Seviyeleri */}
            {[
              { label: "TP 1", value: tradePlan.tp1, pct: tradePlan.rewardPct1, color: "#10b981", opacity: 1 },
              { label: "TP 2", value: tradePlan.tp2, pct: tradePlan.rewardPct2, color: "#10b981", opacity: 0.7 },
              { label: "TP 3", value: tradePlan.tp3, pct: tradePlan.rewardPct3, color: "#10b981", opacity: 0.5 },
            ].map((tp) => (
              <div key={tp.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: tp.color, opacity: tp.opacity }} />
                  <span style={{ fontSize: 11, color: "#8899aa" }}>{tp.label}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#10b981", opacity: tp.opacity }}>{formatPrice(tp.value)}</span>
                  <span style={{ fontSize: 10, color: "#10b981", opacity: tp.opacity, marginLeft: 4 }}>+{tp.pct}%</span>
                </div>
              </div>
            ))}

            <div style={{ borderTop: "1px solid #1e2d40", marginTop: 8, paddingTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: "#ef4444" }} />
                  <span style={{ fontSize: 11, color: "#8899aa" }}>STOP LOSS</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>{formatPrice(tradePlan.sl)}</span>
                  <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 4 }}>-{tradePlan.riskPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk/Ödül */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#8899aa", marginBottom: 2 }}>Risk</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>%{tradePlan.riskPct}</div>
            </div>
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#8899aa", marginBottom: 2 }}>R/R Oranı</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>1 : {tradePlan.rr1}</div>
            </div>
          </div>

          <div style={{ marginTop: 8, padding: "8px 10px", background: "#111827", borderRadius: 8, fontSize: 11, color: "#8899aa", lineHeight: 1.5 }}>
            ⚠️ Bu bir yatırım tavsiyesi değildir. Kendi analizinizi yapın ve risk yönetiminizi uygulayın.
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12, padding: "12px", background: "#111827", borderRadius: 10, textAlign: "center", fontSize: 12, color: "#8899aa" }}>
          Sinyal yetersiz — işlem planı oluşturulamadı
        </div>
      )}

      <div style={{ fontSize: 10, color: "#4a5568", textAlign: "center" }}>
        Son güncelleme: {new Date(data.updatedAt).toLocaleTimeString("tr-TR")}
      </div>
    </div>
  );
}

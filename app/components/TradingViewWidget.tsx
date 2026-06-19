"use client";
import { useEffect, useRef } from "react";

interface Props {
  symbol: string;
  interval: string;
}

export default function TradingViewWidget({ symbol, interval }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}`,
      interval: interval === "1h" ? "60" : interval === "4h" ? "240" : interval === "1d" ? "D" : "60",
      timezone: "Europe/Istanbul",
      theme: "dark",
      style: "1",
      locale: "tr",
      backgroundColor: "rgba(10, 14, 26, 1)",
      gridColor: "rgba(30, 45, 64, 0.5)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      withdateranges: true,
      studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies", "BB@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });

    container.current.appendChild(script);
  }, [symbol, interval]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }} />
    </div>
  );
}

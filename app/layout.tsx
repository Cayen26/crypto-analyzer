import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoAnalyzer — AI Destekli Kripto Analizi",
  description: "TradingView entegrasyonlu, AI destekli kripto para analiz ve öneri platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

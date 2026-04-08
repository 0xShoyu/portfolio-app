// src/lib/market.ts
import yahooFinanceModule from "yahoo-finance2";

/**
 * 兼容性处理：
 * 针对 Next.js 15 / Turbopack 的 ESM 解析逻辑。
 * 确保无论库被识别为 default 导出还是直接导出，都能正确获取到构造函数。
 */
const YahooFinanceClass =
  (yahooFinanceModule as any).default || yahooFinanceModule;
const yahooFinance = new YahooFinanceClass();

export interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  isUp: boolean;
}

// 定义你需要的资产 Ticker
const TICKERS = [
  { symbol: "BTC-USD", name: "BTC" },
  { symbol: "ETH-USD", name: "ETH" },
  { symbol: "GC=F", name: "GOLD" }, // 黄金期货
  { symbol: "CL=F", name: "OIL" }, // WTI 原油期货
  { symbol: "DX-Y.NYB", name: "DXY" }, // 美元指数
  { symbol: "^VIX", name: "VIX" }, // 恐慌指数
  { symbol: "^TNX", name: "US10Y" }, // 十年期美债收益率
];

/**
 * 从雅虎财经抓取实时行情
 * 配合 Next.js 的 ISR (revalidate) 功能，可以实现高性能的静态缓存更新
 */
export async function getMarketData(): Promise<MarketAsset[]> {
  try {
    // 并发请求所有资产的数据
    const quotes = await Promise.all(
      TICKERS.map((t) => yahooFinance.quote(t.symbol)),
    );

    return quotes.map((quote, index) => {
      const changePercent = quote.regularMarketChangePercent || 0;
      return {
        symbol: quote.symbol,
        name: TICKERS[index].name,
        price: quote.regularMarketPrice || 0,
        changePercent: changePercent,
        isUp: changePercent >= 0,
      };
    });
  } catch (error) {
    // 这里的错误捕获非常重要，防止外部 API 波动导致你的 Portfolio 整个白屏
    console.error("Failed to fetch market data from Yahoo Finance:", error);
    return [];
  }
}

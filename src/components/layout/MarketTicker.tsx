// src/components/layout/MarketTicker.tsx
import { getMarketData } from "@/lib/market";
import { TrendingDown, TrendingUp } from "lucide-react";

// ISR 缓存策略：每 60 秒后台重新验证一次数据
// 这保证了你的页面依然是静态化（SSG）的极速体验
export const revalidate = 60;

export async function MarketTicker() {
  const data = await getMarketData();

  if (!data || data.length === 0) return null;

  // 将数据复制一份以实现无缝循环滚动
  const displayData = [...data, ...data];

  return (
    <div className="w-full bg-black/80 border-b border-white/5 text-[11px] font-mono overflow-hidden flex items-center h-8 z-50">
      <div className="flex animate-marquee whitespace-nowrap">
        {displayData.map((asset, i) => (
          <div
            key={`${asset.symbol}-${i}`}
            className="flex items-center gap-2 px-6 border-r border-white/10 last:border-none"
          >
            <span className="text-muted-foreground font-semibold">
              {asset.name}
            </span>
            <span className="text-foreground">
              {/* 根据资产类型决定小数位数 */}
              {asset.price > 1000
                ? asset.price.toLocaleString("en-US", {
                    maximumFractionDigits: 0,
                  })
                : asset.price.toFixed(2)}
            </span>
            <span
              className={`flex items-center ${
                asset.isUp ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {asset.isUp ? (
                <TrendingUp size={12} className="mr-0.5" />
              ) : (
                <TrendingDown size={12} className="mr-0.5" />
              )}
              {Math.abs(asset.changePercent).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

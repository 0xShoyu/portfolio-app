"use client";

import {
  Play,
  Trash2,
  Box,
  Sun,
  Moon,
  Boxes,
  Download,
  Camera,
  Loader2,
} from "lucide-react";
import type { Lang } from "../constants";

export function Toolbar({
  t,
  lang,
  setLang,
  wireframe,
  setWireframe,
  canvasTheme,
  onThemeToggle,
  onClear,
  onRun,
  explodeFactor,
  onExplodeChange,
  code,
  onDownloadCode,
  onDebugCapture,
  debugCapturing,
}: any) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <Box size={18} className="text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
          <p className="text-xs text-muted">{t.subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
        >
          <option value="en">EN</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>

        {/* 🌟 日间/暗黑 模式切换按钮 */}
        <button
          onClick={onThemeToggle}
          title="Toggle Canvas Day/Night Mode"
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-foreground/30 hover:text-foreground transition-colors"
        >
          {canvasTheme === "dark" ? (
            <Sun size={14} className="text-amber-400" />
          ) : (
            <Moon size={14} className="text-sky-400" />
          )}
          <span className="hidden sm:inline">
            {canvasTheme === "dark" ? "Day" : "Night"}
          </span>
        </button>

        <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => setWireframe(e.target.checked)}
          />
          {t.wireframe}
        </label>

        {/* 🌟 分解视图滑块：0 = 正常装配, 1 = 完全分解，纯前端插值，拖动实时生效 */}
        <label
          title="Exploded View"
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted"
        >
          <Boxes size={14} className="text-muted shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explodeFactor ?? 0}
            onChange={(e) => onExplodeChange?.(parseFloat(e.target.value))}
            className="w-16 accent-primary sm:w-20"
          />
          <span className="hidden w-9 text-right tabular-nums sm:inline">
            {Math.round((explodeFactor ?? 0) * 100)}%
          </span>
        </label>

        {/* 🌟 下载代码 + Debug 多角度日夜对照截图：都需要已经生成过一次代码才有意义,
            没有 code 之前不渲染这两个按钮,避免用户点了发现啥也没有。 */}
        {code && (
          <>
            <button
              onClick={onDownloadCode}
              title="Download the current buildModel(THREE) code as a .js file"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-foreground/30 hover:text-foreground transition-colors"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Code</span>
            </button>
            <button
              onClick={onDebugCapture}
              disabled={debugCapturing}
              title="Capture a 6-angle x day/night debug contact sheet"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted hover:border-foreground/30 hover:text-foreground transition-colors disabled:opacity-50"
            >
              {debugCapturing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Camera size={13} />
              )}
              <span className="hidden sm:inline">Debug Shots</span>
            </button>
          </>
        )}

        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-foreground/30 hover:text-foreground"
        >
          <Trash2 size={13} /> {t.clear}
        </button>
        <button
          onClick={onRun}
          className="flex items-center gap-1.5 rounded-md border border-primary/60 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          <Play size={13} /> {t.run}
        </button>
      </div>
    </div>
  );
}

"use client";

import { Play, Trash2, Box } from "lucide-react";
import type { Lang } from "../modelGenerator.constants";

export function Toolbar({
  t,
  lang,
  setLang,
  wireframe,
  setWireframe,
  onClear,
  onRun,
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
        <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => setWireframe(e.target.checked)}
          />
          {t.wireframe}
        </label>
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

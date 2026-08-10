"use client";

import { useState } from "react";
import { X, Download, ImageIcon } from "lucide-react";
import type { DebugCaptureResult } from "../hooks/useThreeEngine";

function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 🌟 Debug 用的多角度日夜对照弹窗。核心产出是顶部那张 composite 图——6 机位 x
// 日/夜 2 主题拼成一张 contact sheet,专门为了"整张丢进跟 AI 的对话里排查穿模
// 问题"这个场景设计的,所以默认操作就是下载这一张整图。下面的缩略图画廊是给你
// 自己肉眼先扫一遍用的,点开能单张放大看细节。
export function DebugCaptureModal({
  result,
  slug,
  onClose,
}: {
  result: DebugCaptureResult;
  slug: string;
  onClose: () => void;
}) {
  const [activeTile, setActiveTile] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-primary shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Debug Contact Sheet
              </h3>
              <p className="text-xs text-muted">
                6 angles × day/night — download the sheet and hand it to your
                AI to spot clipping issues.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-foreground shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="overflow-hidden rounded-xl border border-border/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.compositeDataUrl}
              alt="Multi-angle day/night debug contact sheet"
              className="w-full"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {result.tiles.map((tile, i) => (
              <button
                key={i}
                onClick={() => setActiveTile(i)}
                className="group relative overflow-hidden rounded-lg border border-border/60 hover:border-primary/60 transition-colors"
                title={tile.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.dataUrl}
                  alt={tile.label}
                  className="aspect-square w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-slate-200">
                  {tile.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3.5 py-2 text-xs font-medium text-muted hover:text-foreground"
          >
            Close
          </button>
          <button
            onClick={() =>
              downloadDataUrl(
                `${slug}.debug-sheet.png`,
                result.compositeDataUrl,
              )
            }
            className="flex items-center gap-1.5 rounded-md border border-primary/60 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            <Download size={13} /> Download Contact Sheet
          </button>
        </div>
      </div>

      {/* 单张放大查看 */}
      {activeTile != null && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setActiveTile(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.tiles[activeTile].dataUrl}
            alt={result.tiles[activeTile].label}
            className="max-h-full max-w-full rounded-lg border border-border"
          />
        </div>
      )}
    </div>
  );
}

"use client";

export function PreviewPanel({ containerRef, stats, error, t }: any) {
  return (
    <div className="relative min-h-[360px] flex-1 bg-background lg:min-h-[520px]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ touchAction: "none" }}
      />
      <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between items-center">
        <div className="pointer-events-auto rounded-md border border-border bg-background/70 px-2.5 py-1.5 font-mono text-[11px] text-primary backdrop-blur-sm">
          {t.triangles}: {stats.triangles} | {t.vertices}: {stats.vertices}
        </div>
      </div>
      {error && (
        <div className="absolute inset-x-0 bottom-0 max-h-[40%] overflow-y-auto whitespace-pre-wrap border-t border-red-900/60 bg-red-950/90 px-4 py-3 font-mono text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

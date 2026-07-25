"use client";

import dynamic from "next/dynamic";

// 🌟 在客户端组件内部使用 ssr: false 是完全合法的
const ModelGenerator = dynamic(
  () => import("@/components/tools/ModelGenerator").then((mod) => mod.ModelGenerator),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] w-full items-center justify-center rounded-2xl border border-border bg-card/40 font-mono text-sm text-muted">
        <span className="animate-pulse">Loading 3D WebGL Engine...</span>
      </div>
    ),
  }
);

export function ModelGeneratorClient() {
  return <ModelGenerator />;
}

"use client";

import { Card } from "@/components/ui/Card";
import { Box } from "lucide-react";

export function ToolsSection() {
  return (
    <section id="tools" className="pb-32 scroll-mt-24 relative">
      <div className="flex flex-col gap-4 mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Tools.
        </h2>
        <p className="text-muted text-lg max-w-2xl font-light">
          An AI-assisted low-poly Three.js model previewer — describe a
          shape, watch it render live.
        </p>
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
          <Box size={18} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">
            3D Model Previewer & Generator
          </span>
        </div>
        <iframe
          src="/threejs-preview.html"
          className="w-full h-[640px] border-0"
          title="Three.js Model Previewer"
        />
      </Card>
    </section>
  );
}

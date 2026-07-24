"use client";

import { Card } from "@/components/ui/Card";
import { Box } from "lucide-react";
import { ModelGenerator } from "@/components/tools/ModelGenerator";

export function ToolsSection() {
  return (
    <section id="tools" className="pb-32 scroll-mt-24 relative">
      <div className="flex flex-col gap-4 mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Tools.
        </h2>
        <p className="text-muted text-lg max-w-2xl font-light">
          An AI-assisted low-poly Three.js model previewer — describe a shape,
          watch it render live.
        </p>
      </div>

      <Card className="p-0">
        <ModelGenerator />
      </Card>
    </section>
  );
}

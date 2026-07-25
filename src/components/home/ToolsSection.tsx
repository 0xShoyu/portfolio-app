"use client";

import { Card } from "@/components/ui/Card";
import { Box, ArrowRight, Sparkles, Cpu, Eye } from "lucide-react";
import Link from "next/link";
import { CardIcon } from "@/components/ui/CardIcon";
import { TechBadge } from "@/components/ui/TechBadge";

export function ToolsSection() {
  return (
    <section id="tools" className="pb-32 scroll-mt-24 relative">
      <div className="flex flex-col gap-4 mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Tools & Experiments.
        </h2>
        <p className="text-muted text-lg max-w-2xl font-light">
          Interactive developer utilities and AI-augmented generation engines
          built from first principles.
        </p>
      </div>

      <Card className="group relative overflow-hidden p-8 md:p-10 border border-border/50 bg-gradient-to-br from-card/80 via-card/40 to-background transition-all duration-500 hover:border-primary/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 z-10 relative">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <CardIcon icon={Box} color="text-primary" className="mb-0" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                <Sparkles size={13} /> AI Studio
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
              AI 3D Low-Poly Generator
            </h3>

            <p className="text-muted font-light text-sm md:text-base leading-relaxed mb-8">
              A self-healing 3D asset pipeline. Generates production-ready
              Three.js code via Gemini 3.6 Flash, renders with real-time
              shadow-mapped WebGL, and uses Gemini Vision for automated visual
              critique loops.
            </p>

            <div className="flex flex-wrap gap-2">
              <TechBadge name="Next.js 15" />
              <TechBadge name="Three.js" />
              <TechBadge name="TypeScript" />
              <TechBadge name="Vibe Coding" />
            </div>
          </div>

          <Link
            href="/tools/3d-generator"
            className="group/btn inline-flex items-center gap-2.5 rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0"
          >
            Launch Studio
            <ArrowRight
              size={18}
              className="transition-transform group-hover/btn:translate-x-1"
            />
          </Link>
        </div>

        {/* 背景微弱网格装饰 */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors duration-500" />
      </Card>
    </section>
  );
}

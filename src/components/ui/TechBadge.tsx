"use client";

import { cn } from "@/lib/utils";
import {
  Code2,
  Database,
  Bot,
  Terminal,
  TrendingUp,
  Briefcase,
  Layers,
  Globe,
  Zap,
  Box,
  Cpu,
  Layout,
  FileText,
} from "lucide-react";

const FigmaIcon = ({ size, className }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="312 340 400 600"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M312 840C312 784.772 356.772 740 412 740H512V840C512 895.228 467.228 940 412 940C356.772 940 312 895.228 312 840Z" fill="currentColor" />
    <path d="M512 340V540H612C667.228 540 712 495.228 712 440C712 384.772 667.228 340 612 340H512Z" fill="currentColor" />
    <path d="M611.167 740C666.395 740 711.167 695.228 711.167 640C711.167 584.772 666.395 540 611.167 540C555.939 540 511.167 584.772 511.167 640C511.167 695.228 555.939 740 611.167 740Z" fill="currentColor" />
    <path d="M312 440C312 495.228 356.772 540 412 540H512V340H412C356.772 340 312 384.772 312 440Z" fill="currentColor" />
    <path d="M312 640C312 695.228 356.772 740 412 740H512V540H412C356.772 540 312 584.772 312 640Z" fill="currentColor" />
  </svg>
);

const ServerIcon = Database;

// 样式映射表
const getTechStyle = (techName: string) => {
  const styles: Record<string, { icon: any; color: string; border: string }> = {
    // Languages & Frameworks
    "Next.js": { icon: Box, color: "text-white", border: "border-white/20" },
    "Next.js 15": { icon: Box, color: "text-white", border: "border-white/20" },
    "React": { icon: Code2, color: "text-blue-400", border: "border-blue-500/20" },
    "Tailwind v4": { icon: Code2, color: "text-sky-400", border: "border-sky-500/20" },
    "TypeScript": { icon: Code2, color: "text-blue-400", border: "border-blue-500/20" },
    "Node.js": { icon: ServerIcon, color: "text-green-400", border: "border-green-500/20" },
    
    // Database & Backend
    "PostgreSQL": { icon: Database, color: "text-blue-300", border: "border-blue-400/20" },
    "MongoDB": { icon: Database, color: "text-green-500", border: "border-green-500/20" },
    "Docker": { icon: Box, color: "text-blue-500", border: "border-blue-500/20" },
    
    // Tools & Automation
    "Puppeteer": { icon: Bot, color: "text-emerald-400", border: "border-emerald-500/20" },
    "Ops Automation": { icon: Terminal, color: "text-orange-400", border: "border-orange-500/20" },
    "Cursor": { icon: Zap, color: "text-white", border: "border-white/20" },
    "Figma to Code": { icon: FigmaIcon, color: "text-rose-400", border: "border-rose-500/20" },
    "Vibe Coding": { icon: Zap, color: "text-yellow-400", border: "border-yellow-500/20" },
    "Rapid Prototyping": { icon: Layout, color: "text-indigo-400", border: "border-indigo-500/20" },

    // Business & Web3
    "GTM Strategy": { icon: TrendingUp, color: "text-purple-400", border: "border-purple-500/20" },
    "ROI-First": { icon: Briefcase, color: "text-yellow-400", border: "border-yellow-500/20" },
    "System Design": { icon: Layout, color: "text-pink-400", border: "border-pink-500/20" },
    "Tokenomics": { icon: Globe, color: "text-amber-400", border: "border-amber-500/20" },
    "Fintech": { icon: TrendingUp, color: "text-green-400", border: "border-green-500/20" },
    "Avalanche": { icon: Layers, color: "text-red-400", border: "border-red-500/20" },
    "Polygon": { icon: Layers, color: "text-purple-400", border: "border-purple-500/20" },
    "SocialFi": { icon: Globe, color: "text-sky-400", border: "border-sky-500/20" },
  };

  return styles[techName] || { icon: Cpu, color: "text-slate-400", border: "border-slate-500/20" };
};

export function TechBadge({ name }: { name: string }) {
  const style = getTechStyle(name);
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:border-white/20 cursor-default",
        style.color,
        style.border
      )}
    >
      <Icon size={12} className="opacity-70" />
      <span className="opacity-90">{name}</span>
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import {
  Code2,
  Briefcase,
  Zap,
  Globe,
  Cpu,
  Database,
  Bot,
  Layers,
  Terminal,
  TrendingUp,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";

const getTechStyle = (techName: string) => {
  const styles: Record<string, { icon: any; color: string; border: string }> = {
    "Next.js": { icon: Box, color: "text-white", border: "border-white/20" },
    TypeScript: {
      icon: Code2,
      color: "text-blue-400",
      border: "border-blue-500/20",
    },
    "Node.js": {
      icon: ServerIcon,
      color: "text-green-400",
      border: "border-green-500/20",
    },
    PostgreSQL: {
      icon: Database,
      color: "text-blue-300",
      border: "border-blue-400/20",
    },
    MongoDB: {
      icon: Database,
      color: "text-green-500",
      border: "border-green-500/20",
    },
    Puppeteer: {
      icon: Bot,
      color: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    "Ops Automation": {
      icon: Terminal,
      color: "text-orange-400",
      border: "border-orange-500/20",
    },
    "GTM Strategy": {
      icon: TrendingUp,
      color: "text-purple-400",
      border: "border-purple-500/20",
    },
    "ROI-First": {
      icon: Briefcase,
      color: "text-yellow-400",
      border: "border-yellow-500/20",
    },
    Avalanche: {
      icon: Layers,
      color: "text-red-400",
      border: "border-red-500/20",
    },
    Polygon: {
      icon: Layers,
      color: "text-purple-400",
      border: "border-purple-500/20",
    },
    SocialFi: {
      icon: Globe,
      color: "text-sky-400",
      border: "border-sky-500/20",
    },
    "Figma to Code": {
      icon: FigmaIcon,
      color: "text-rose-400",
      border: "border-rose-500/20",
    },
    Cursor: { icon: Zap, color: "text-white", border: "border-white/20" },
  };

  return (
    styles[techName] || {
      icon: Cpu,
      color: "text-slate-400",
      border: "border-slate-500/20",
    }
  );
};

const FigmaIcon = ({ size, className }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="312 340 400 600"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M312 840C312 784.772 356.772 740 412 740H512V840C512 895.228 467.228 940 412 940C356.772 940 312 895.228 312 840Z"
      fill="currentColor"
    />
    <path
      d="M512 340V540H612C667.228 540 712 495.228 712 440C712 384.772 667.228 340 612 340H512Z"
      fill="currentColor"
    />
    <path
      d="M611.167 740C666.395 740 711.167 695.228 711.167 640C711.167 584.772 666.395 540 611.167 540C555.939 540 511.167 584.772 511.167 640C511.167 695.228 555.939 740 611.167 740Z"
      fill="currentColor"
    />
    <path
      d="M312 440C312 495.228 356.772 540 412 540H512V340H412C356.772 340 312 384.772 312 440Z"
      fill="currentColor"
    />
    <path
      d="M312 640C312 695.228 356.772 740 412 740H512V540H412C356.772 540 312 584.772 312 640Z"
      fill="currentColor"
    />
  </svg>
);

const ServerIcon = Database;

const features = [
  {
    title: "Full-Stack Product Engineering",
    description:
      "Architecting production-grade applications with Next.js, Node.js, and Puppeteer.",
    tech: ["Next.js", "TypeScript", "Node.js", "MongoDB", "Puppeteer"],
    icon: Code2,
    color: "text-blue-400",
    className: "md:col-span-2",
  },
  {
    title: "Strategic Mindset",
    description:
      "8+ years of leadership as a Ops Executive. I write code with ROI, GTM strategy, and scalability in mind",
    tech: ["Ops Automation", "GTM Strategy", "ROI-First"],
    icon: Briefcase,
    color: "text-yellow-400",
    className: "md:col-span-1",
  },
  {
    title: "Web3 Veteran",
    description:
      "Deep roots since 2017. A SocialFi domain expert who managed technical deployments for L1 giants.",
    tech: ["Avalanche", "Polygon", "SocialFi"],
    icon: Globe,
    color: "text-sky-400",
    className: "md:col-span-1",
  },
  {
    title: "AI-Augmented Delivery",
    description:
      "Leveraging AI workflows to transition from Figma prototypes to shipable code at 10x startup speed.",
    tech: ["Figma to Code", "Cursor", "Rapid Prototyping"],
    icon: Zap,
    color: "text-purple-400",
    className: "md:col-span-2",
  },
];

export function FeatureGrid() {
  return (
    <section className="pb-32 relative">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={feature.className}
          >
            <Card className="h-full flex flex-col justify-between group hover:border-white/10 transition-colors duration-500">
              <div>
                <div className="relative mb-6 inline-block">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500",
                      feature.color.replace("text-", "bg-"),
                    )}
                  />

                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-foreground group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                    <feature.icon size={24} className={feature.color} />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-muted leading-relaxed font-light text-sm mb-6">
                  {feature.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 mt-auto">
                {feature.tech.map((t) => {
                  const style = getTechStyle(t);
                  const Icon = style.icon;
                  return (
                    <div
                      key={t}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border bg-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:border-white/20 cursor-default",
                        style.color,
                        style.border,
                      )}
                    >
                      <Icon size={12} className="opacity-70" />
                      <span className="opacity-90">{t}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

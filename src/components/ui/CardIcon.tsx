"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CardIconProps {
  icon: LucideIcon | any;
  color: string; // e.g., "text-blue-400"
  className?: string;
}

export function CardIcon({ icon: Icon, color, className }: CardIconProps) {
  const haloColor = color.replace("text-", "bg-");

  return (
    <div className={cn("relative inline-block mb-6", className)}>
      {/* Halo Effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500",
          haloColor,
        )}
      />
      {/* Icon Container */}
      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-foreground group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
        <Icon size={24} className={color} />
      </div>
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Code2, Briefcase, Zap, Globe } from "lucide-react";
import { TechBadge } from "@/components/ui/TechBadge";
import { CardIcon } from "@/components/ui/CardIcon";

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
    tech: ["Avalanche", "Polygon", "SocialFi", "Tokenomics"],
    icon: Globe,
    color: "text-sky-400",
    className: "md:col-span-1",
  },
  {
    title: "AI-Augmented Delivery",
    description:
      "Leveraging AI workflows to transition from Figma prototypes to shipable code at 10x startup speed.",
    tech: ["Figma to Code", "Vibe Coding", "Rapid Prototyping"],
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
                <CardIcon icon={feature.icon} color={feature.color} />

                <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-muted leading-relaxed font-light text-sm mb-6">
                  {feature.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 mt-auto">
                {feature.tech.map((t) => (
                  <TechBadge key={t} name={t} />
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

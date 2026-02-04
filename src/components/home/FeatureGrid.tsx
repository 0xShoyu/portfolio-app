"use client";

import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Code2, Briefcase, Zap, Globe } from "lucide-react";

const features = [
  {
    title: "Full-Stack Product Engineering",
    description:
      "Architecting production-grade applications with Next.js, Node.js, and Puppeteer.",
    tech: [
      "Next.js",
      "TypeScript",
      "Node.js",
      "PostgreSQL",
      "MongoDB",
      "Puppeteer",
    ],
    icon: Code2,
    className: "md:col-span-2",
  },
  {
    title: "Strategic Mindset",
    description:
      "8+ years of leadership as a Ops Executive. I write code with ROI, GTM strategy, and scalability in mind",
    tech: ["Ops Automation", "GTM Strategy", "ROI-First"],
    icon: Briefcase,
    className: "md:col-span-1",
  },
  {
    title: "Web3 Veteran",
    description:
      "Deep roots since 2017. A SocialFi domain expert who managed technical deployments for L1 giants.",
    tech: ["Avalanche", "Polygon", "SocialFi", "Tokenomics"],
    icon: Globe,
    className: "md:col-span-1",
  },
  {
    title: "AI-Augmented Delivery",
    description:
      "Leveraging AI workflows to transition from Figma prototypes to shipable code at 10x startup speed.",
    tech: ["Figma to Code", "Vibe Coing", "Rapid Prototyping"],
    icon: Zap,
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
            <Card>
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted leading-relaxed font-light text-sm mb-6">
                  {feature.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {feature.tech.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-primary/80 font-mono"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

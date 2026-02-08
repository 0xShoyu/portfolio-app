"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Github, Cpu, Layout, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { TechBadge } from "@/components/ui/TechBadge";
import { CardIcon } from "@/components/ui/CardIcon";

const projects = [
  {
    id: "twitter-scraper",
    title: "Twitter Sentiment Engine",
    subtitle: "Saving $60k/yr in API Costs",
    description:
      "A production-grade scraping microservice handling 10k+ daily requests. Features browser pooling, proxy rotation, and anti-bot evasion algorithms.",
    tags: ["Node.js", "Puppeteer", "MongoDB", "Docker"],
    link: "/portfolio/twitter-scraper-engine",
    github: "https://github.com/0xShoyu/twitter-scanner-public",
    icon: Cpu,
    color: "text-emerald-400",
    size: "large",
  },
  {
    id: "portfolio",
    title: "0xShoyu.dev",
    subtitle: "Next.js 15 Documentation Hub",
    description:
      "My digital garden built with App Router, MDX, and Tailwind v4. Designed for performance and developer experience.",
    tags: ["Next.js 15", "React", "Tailwind v4"],
    link: "https://github.com/0xShoyu/portfolio-app",
    github: "https://github.com/0xShoyu/portfolio-app",
    icon: Layout,
    color: "text-blue-400",
    size: "small",
  },
  {
    id: "star-miner",
    title: "Star Miner Protocol",
    subtitle: "Game Design Document (GDD)",
    description:
      "System architecture for a decentralized resource management game, featuring complex tokenomics and simulated economy.",
    tags: ["System Design", "Tokenomics"],
    link: "/docs/star-miner-gdd",
    github: null,
    icon: FileText,
    color: "text-amber-400",
    size: "small",
  },
];

export function PortfolioSection() {
  return (
    <section id="portfolio" className="pb-32 scroll-mt-24 relative">
      <div className="flex flex-col gap-4 mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Selected Work.
        </h2>
        <p className="text-muted text-lg max-w-2xl font-light">
          I don&apos;t just write code; I solve business problems. Here are a
          few projects that demonstrate my ability to ship complex systems.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              project.size === "large" ? "md:col-span-2" : "md:col-span-1",
            )}
          >
            <Card className="h-full flex flex-col justify-between group hover:border-white/10 transition-all duration-500">
              {/* Header: Icon + Links */}
              <div className="flex justify-between items-start mb-6">
                <CardIcon icon={project.icon} color={project.color} />

                {project.github && (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-foreground transition-colors p-2"
                  >
                    <Github size={20} />
                  </a>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-2xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                </div>

                <p
                  className={cn(
                    "text-sm font-medium mb-4 opacity-80",
                    project.color,
                  )}
                >
                  {project.subtitle}
                </p>

                <p className="text-muted leading-relaxed font-light text-sm mb-8">
                  {project.description}
                </p>
              </div>

              {/* Footer: Tags & Action Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto">
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <TechBadge key={tag} name={tag} />
                  ))}
                </div>

                {/* Case Study Button */}
                <Link
                  href={project.link}
                  className="group/link inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors mt-4 sm:mt-0"
                >
                  Read Case Study
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover/link:translate-x-1"
                  />
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

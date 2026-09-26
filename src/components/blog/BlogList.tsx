"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardIcon } from "@/components/ui/CardIcon";
import { TechBadge } from "@/components/ui/TechBadge";
import type { Post } from "@/lib/mdx";

export function BlogList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-24 rounded-xl border border-dashed border-border/50">
        <p className="text-muted font-light">
          No posts yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post, index) => (
        <motion.div
          key={post.metadata.slug}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08 }}
        >
          <Link
            href={`/blog/${post.metadata.slug}`}
            className="block group"
          >
            <Card className="hover:border-white/10 transition-all duration-500">
              {/* Header: Icon + Meta */}
              <div className="flex justify-between items-start mb-6">
                <CardIcon icon={BookOpen} color="text-sky-400" />

                <div className="flex items-center gap-4 text-muted text-xs shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="opacity-70" />
                    {post.metadata.date}
                  </div>
                  {post.metadata.readingTime && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <Clock size={12} className="opacity-70" />
                      {post.metadata.readingTime}
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground tracking-tight mb-3 group-hover:text-primary transition-colors">
                  {post.metadata.title}
                </h2>

                <p className="text-muted leading-relaxed font-light text-sm mb-8">
                  {post.metadata.description}
                </p>
              </div>

              {/* Footer: Tags & Read Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-auto">
                <div className="flex flex-wrap gap-2">
                  {post.metadata.tags?.map((tag) => (
                    <TechBadge key={tag} name={tag} />
                  ))}
                </div>

                <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors shrink-0">
                  Read Article
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

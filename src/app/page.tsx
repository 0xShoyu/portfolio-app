import { Container } from "@/components/ui/Container";
import { Hero } from "@/components/home/Hero";
import { FeatureGrid } from "@/components/home/FeatureGrid";

export default function Home() {
  return (
    <Container>
      {/* 1. Hero */}
      <Hero />

      {/* 2. Bento Grid */}
      <FeatureGrid />

      {/* 3. 预留给最新的博客/项目展示区 (Phase 3 再做) */}
      <div className="py-24 border-t border-border/40">
        <h3 className="text-center text-muted">
          Latest Projects / Writings coming soon...
        </h3>
      </div>
    </Container>
  );
}

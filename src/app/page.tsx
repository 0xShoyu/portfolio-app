import { Container } from "@/components/ui/Container";
import { Hero } from "@/components/home/Hero";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { PortfolioSection } from "@/components/home/PortfolioSection";

export default function Home() {
  return (
    <Container>
      {/* 1. Hero */}
      <Hero />

      {/* 2. Bento Grid */}
      <FeatureGrid />

      {/* 3. Portfolio */}
      <PortfolioSection />

      {/* 4. Footer Placeholder */}
      <div className="py-24 border-t border-border/40 mt-12 text-center">
        <p className="text-muted text-sm">
          © 2026 0xShoyu. Built with Next.js & Coffee.
        </p>
      </div>
    </Container>
  );
}

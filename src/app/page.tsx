import { Container } from "@/components/ui/Container";
import { Hero } from "@/components/home/Hero";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { ToolsSection } from "@/components/home/ToolsSection";
import { PortfolioSection } from "@/components/home/PortfolioSection";

export default function Home() {
  return (
    <Container>
      <Hero />

      <FeatureGrid />

      <ToolsSection />

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

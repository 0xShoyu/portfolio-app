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

      <PortfolioSection />

      <ToolsSection />
    </Container>
  );
}

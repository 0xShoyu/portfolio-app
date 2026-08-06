import { Container } from "@/components/ui/Container";
import { ArrowLeft, Box } from "lucide-react";
import Link from "next/link";
import { ModelGeneratorClient } from "../../../../threejs-ai-model-generator/components/ModelGeneratorClient";

// 保留服务端组件导出的 metadata (有利于 SEO)
export const metadata = {
  title: "3D Low-Poly Generator | 0xShoyu",
  description:
    "An AI-assisted low-poly Three.js model generator with real-time WebGL rendering and vision feedback.",
};

export default function ModelGeneratorPage() {
  return (
    <Container className="py-12 md:py-16">
      <div className="mb-8">
        <Link
          href="/#tools"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-1"
          />
          Back to Tools
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Box size={22} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              3D Low-Poly AI Studio
            </h1>
            <p className="text-muted text-sm md:text-base font-light mt-1">
              Describe an asset in natural language, watch Gemini generate
              Three.js code, and review live WebGL renders with Vision AI.
            </p>
          </div>
        </div>
      </div>

      <ModelGeneratorClient />
    </Container>
  );
}

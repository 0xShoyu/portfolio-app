import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { getMDXData, getSortedPosts } from "@/lib/mdx";
import { BlogList } from "@/components/blog/BlogList";

export const metadata: Metadata = {
  title: "Blog | 0xShoyu",
  description:
    "Notes on shipping product, AI-augmented development, and building things from first principles.",
};

export default function BlogPage() {
  const posts = getSortedPosts(getMDXData("blog"));

  return (
    <Container className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
          Blog.
        </h1>
        <p className="text-muted text-lg font-light max-w-2xl">
          Notes on shipping product, AI-augmented workflows, and building
          things from first principles.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <BlogList posts={posts} />
      </div>
    </Container>
  );
}

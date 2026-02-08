import { getPostBySlug, getAllSlugs } from "@/lib/mdx";
import { Container } from "@/components/ui/Container";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft, Calendar, User } from "lucide-react";
import Link from "next/link";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

const CustomLink = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const href = props.href;
  const isInternal = href && (href.startsWith("/") || href.startsWith("#"));

  if (isInternal) {
    return (
      <Link
        href={href}
        className="text-primary hover:underline underline-offset-4"
        {...props}
      >
        {props.children}
      </Link>
    );
  }

  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline underline-offset-4 cursor-pointer"
      {...props}
    >
      {props.children}
    </a>
  );
};

const components = {
  a: CustomLink,
};

const prettyCodeOptions = {
  theme: "github-dark",
  keepBackground: false,
  defaultLang: "plaintext",
};

export async function generateStaticParams() {
  const slugs = getAllSlugs("portfolio");
  return slugs.map((slug) => ({ slug }));
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug("portfolio", slug);

  if (!post) {
    notFound();
  }

  return (
    <Container className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors mb-12 group"
        >
          <ArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-1"
          />
          Back to Home
        </Link>

        <article>
          <header className="mb-12">
            <div className="flex flex-wrap gap-2 mb-6">
              {post.metadata.tags?.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-8 tracking-tight leading-[1.2]">
              {post.metadata.title}
            </h1>

            <div className="flex items-center gap-6 text-muted text-sm border-y border-border/40 py-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="opacity-70" />
                {post.metadata.date}
              </div>
              <div className="flex items-center gap-2">
                <User size={14} className="opacity-70" />
                0xShoyu
              </div>
            </div>
          </header>

          <div className="prose prose-sky dark:prose-invert max-w-none">
            <MDXRemote
              source={post.content}
              components={components}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
                },
              }}
            />
          </div>

          <div className="mt-20 pt-12 border-t border-border/40 text-center">
            <p className="text-muted text-sm italic">
              Thanks for reading. Feel free to reach out if you have any
              questions about this project.
            </p>
          </div>
        </article>
      </div>
    </Container>
  );
}

// src/lib/mdx.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type PostMetadata = {
  title: string;
  date: string;
  description: string;
  slug: string;
  tags?: string[];
};

export type Post = {
  metadata: PostMetadata;
  content: string;
};

const contentDirectory = path.join(process.cwd(), "content");

function getMDXFiles(dir: string) {
  const fullPath = path.join(contentDirectory, dir);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath).filter((file) => path.extname(file) === ".mdx");
}

function readMDXFile(filePath: string) {
  const rawContent = fs.readFileSync(filePath, "utf-8");
  return matter(rawContent);
}

export function getMDXData(dir: string): Post[] {
  const mdxFiles = getMDXFiles(dir);
  const fullPath = path.join(contentDirectory, dir);

  return mdxFiles.map((file) => {
    const { data, content } = readMDXFile(path.join(fullPath, file));

    return {
      metadata: {
        title: data.title,
        date: data.date,
        description: data.description || data.summary,
        tags: data.tags || [],
        slug: file.replace(".mdx", ""),
      } as PostMetadata,
      content,
    };
  });
}

export function getPostBySlug(dir: string, slug: string): Post | null {
  const filePath = path.join(contentDirectory, dir, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const { data, content } = readMDXFile(filePath);

  return {
    metadata: {
      title: data.title,
      date: data.date,
      description: data.description || data.summary,
      tags: data.tags || [],
      slug: slug,
    } as PostMetadata,
    content,
  };
}

export function getAllSlugs(dir: string) {
  const mdxFiles = getMDXFiles(dir);
  return mdxFiles.map((file) => file.replace(".mdx", ""));
}

export function getSortedPosts(posts: Post[]) {
  return posts.sort((a, b) => {
    if (new Date(a.metadata.date) > new Date(b.metadata.date)) {
      return -1;
    }
    return 1;
  });
}

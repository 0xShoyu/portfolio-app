// src/lib/mdx.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Define article's metadata type
export type PostMetadata = {
  title: string;
  publishedAt: string;
  summary: string;
  slug: string;
};

// Define full article type
export type Post = {
  metadata: PostMetadata;
  content: string;
};

// Fetch the path of "content" directory
function getMDXFiles(dir: string) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === ".mdx");
}

// Fetch the content of a signle article
function readMDXFile(filePath: string) {
  const rawContent = fs.readFileSync(filePath, "utf-8");
  return matter(rawContent);
}

// Fetch all article data under certain derectory
export function getMDXData(dir: string): Post[] {
  const fullPath = path.join(process.cwd(), "content", dir);

  if (!fs.existsSync(fullPath)) {
    return [];
  }

  const mdxFiles = getMDXFiles(fullPath);

  return mdxFiles.map((file) => {
    const { data, content } = readMDXFile(path.join(fullPath, file));

    return {
      metadata: {
        title: data.title,
        publishedAt: data.publishedAt,
        summary: data.summary,
        slug: data.slug || file.replace(".mdx", ""),
      },
      content,
    };
  });
}

// Sort based on publish date
export function getSortedPosts(posts: Post[]) {
  return posts.sort((a, b) => {
    if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
      return -1;
    }
    return 1;
  });
}

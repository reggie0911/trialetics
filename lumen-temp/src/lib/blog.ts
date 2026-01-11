import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

const BLOGS_PATH = path.join(process.cwd(), 'src/blog');

export type Author = {
  name: string;
  image: string;
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: Author;
  tags: string[];
  content: string;
  coverImage: string;
};

export function getBlogSlugs(): string[] {
  return fs.readdirSync(BLOGS_PATH).filter((path) => /\.mdx?$/.test(path));
}

export function getBlogBySlug(slug: string): BlogPost {
  const realSlug = slug.replace(/\.mdx$/, '');
  const fullPath = path.join(BLOGS_PATH, `${realSlug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug: realSlug,
    title: data.title,
    description: data.description,
    date: data.date,
    author: data.author,
    tags: data.tags,
    content,
    coverImage: data.coverImage,
  };
}

export function getAllBlogs(limit?: number): BlogPost[] {
  const slugs = getBlogSlugs();
  const posts = slugs
    .map((slug) => getBlogBySlug(slug))
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts.slice(0, limit);
}

import { getAllBlogs } from '@/lib/blog';
import { calculateReadTime } from '@/lib/read-time';

import BlogClient from './blog-client';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

export default async function BlogPage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  // Get all blog posts
  const allBlogPosts = getAllBlogs();

  // Add category and readTime to posts
  const enhancedBlogPosts = allBlogPosts.map((post) => ({
    ...post,
    category: post.tags[0] || 'Resource',
    readTime: calculateReadTime(post.content),
  }));

  return <BlogClient posts={enhancedBlogPosts} />;
}

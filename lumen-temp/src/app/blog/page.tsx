import { getAllBlogs } from '@/lib/blog';
import { calculateReadTime } from '@/lib/read-time';

import BlogClient from './blog-client';

export default function BlogPage() {
  // Get all blog posts on the server side
  const allBlogPosts = getAllBlogs();

  // Add category and readTime to posts
  const enhancedBlogPosts = allBlogPosts.map((post) => ({
    ...post,
    category: post.tags[0] || 'Resource',
    readTime: calculateReadTime(post.content),
  }));

  return <BlogClient posts={enhancedBlogPosts} />;
}

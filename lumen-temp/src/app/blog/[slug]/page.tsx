import { ChevronLeft, Facebook, MessageCircle, Twitter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { compileMDX } from 'next-mdx-remote/rsc';

import { BlogCard, EnhancedBlogPost } from '@/app/blog/blog-client';
import { getAllBlogs, getBlogBySlug, getBlogSlugs } from '@/lib/blog';
import { calculateReadTime } from '@/lib/read-time';

import { AnimatedHeroImage } from './animated-hero-image';

export async function generateStaticParams() {
  const slugs = getBlogSlugs();
  return slugs.map((slug) => ({
    slug: slug.replace(/\.mdx$/, ''),
  }));
}

// Get category from the first tag (most relevant)
const getCategoryFromTags = (tags: string[]): string => {
  return tags[0] || 'General';
};

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  const { content } = await compileMDX({
    source: post.content,
    options: { parseFrontmatter: true },
  });

  // Get related posts
  const allPosts = getAllBlogs();
  const relatedPosts = allPosts
    .filter(
      (p) => p.slug !== slug && p.tags.some((tag) => post.tags.includes(tag)),
    )
    .slice(0, 3);

  const readTime = calculateReadTime(post.content);

  return (
    <div className="section-padding container">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/blog"
            className="group text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Blog
          </Link>

          {/* Title and Description */}
          <h1 className="mb-4 text-4xl tracking-tight md:text-5xl lg:text-6xl">
            {post.title}
          </h1>
          <p className="text-muted-foreground mb-8 text-lg md:text-xl">
            {post.description}
          </p>
        </header>

        {/* Hero Image */}
        <div className="">
          <AnimatedHeroImage
            src={post.coverImage}
            alt={post.title}
            slug={post.slug}
          />
        </div>

        {/* Author Information */}
        <div className="mt-8 mb-12 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative size-14 overflow-hidden rounded-full">
              <Image
                src={post.author.image}
                alt={post.author.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="text-foreground text-2xl font-semibold">
                {post.author.name}
              </div>
              <div className="">
                {new Date(post.date).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                · {readTime}
              </div>
            </div>
          </div>

          {/* Social Share Icons */}
          <div className="bg-background border-input [&_*]:border-input grid grid-cols-3 items-center divide-x rounded-sm border shadow-sm">
            <Link
              href={post.author.facebookUrl}
              className="flex items-center justify-center px-3 py-2.5 md:px-5"
            >
              <Facebook className="size-4 shrink-0 md:size-5" />
            </Link>
            <Link
              href={post.author.twitterUrl}
              className="flex items-center justify-center px-3 py-2.5 md:px-5"
            >
              <Twitter className="size-4 shrink-0 md:size-5" />
            </Link>
            <Link
              href={post.author.linkedinUrl}
              className="flex items-center justify-center px-3 py-2.5 md:px-5"
            >
              <MessageCircle className="size-4 shrink-0 md:size-5" />
            </Link>
          </div>
        </div>

        {/* Article Content */}
        <article className="prose lg:prose-lg prose-headings:font-weight-display dark:prose-invert prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed prose-img:rounded-xl prose-img:shadow-sm prose-a:text-primary prose-a:no-underline hover:prose-a:underline mx-auto max-w-none">
          {content}
        </article>
      </div>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <section className="mt-20 lg:mt-24">
          <h2 className="text-4xl tracking-tight lg:text-5xl">
            Related Articles
          </h2>
          <p className="text-muted-foreground mt-3 text-lg leading-snug lg:mt-4">
            From seamless integrations to productivity wins and fresh feature
            drops—these stories show how Pulse empowers teams to save time,
            collaborate better, and stay ahead in fast-paced work environments.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
            {relatedPosts.map((relatedPost) => {
              const enhancedPost: EnhancedBlogPost = {
                ...relatedPost,
                category: getCategoryFromTags(relatedPost.tags),
                readTime: calculateReadTime(relatedPost.content),
              };

              return (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="group block h-full"
                >
                  <BlogCard post={enhancedPost} />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

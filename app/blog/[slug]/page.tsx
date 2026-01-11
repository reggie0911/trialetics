import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { getAllBlogs, getBlogBySlug } from '@/lib/blog';
import { calculateReadTime } from '@/lib/read-time';

export async function generateStaticParams() {
  const posts = getAllBlogs();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);

  if (!post) {
    notFound();
  }

  const readTime = calculateReadTime(post.content);

  return (
    <article className="section-padding container max-w-4xl">
      <Link
        href="/blog"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to blog
      </Link>

      <header className="mb-12">
        <div className="mb-6 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="capitalize">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="mb-4 text-4xl font-medium tracking-tighter md:text-5xl lg:text-6xl">
          {post.title}
        </h1>

        <p className="text-muted-foreground mb-8 text-lg">
          {post.description}
        </p>

        <div className="flex items-center gap-4">
          <Image
            src={post.author.image}
            alt={post.author.name}
            width={48}
            height={48}
            className="rounded-full"
          />
          <div>
            <div className="font-medium">{post.author.name}</div>
            <div className="text-muted-foreground text-sm">
              {new Date(post.date).toLocaleDateString('en-GB', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              · {readTime}
            </div>
          </div>
        </div>
      </header>

      <div className="relative mb-12 aspect-[16/9] overflow-hidden rounded-2xl">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p>{post.content}</p>
        <p>
          This is a demo blog post. In a production environment, this would contain
          the full article content rendered from MDX or Markdown.
        </p>
        <h2>Key Takeaways</h2>
        <ul>
          <li>Trialetics helps you optimize your workflow</li>
          <li>Streamline your team collaboration</li>
          <li>Track issues with less noise</li>
          <li>Filter tasks to stay focused</li>
        </ul>
        <p>
          Stay tuned for more articles and updates from the Trialetics team!
        </p>
      </div>
    </article>
  );
}

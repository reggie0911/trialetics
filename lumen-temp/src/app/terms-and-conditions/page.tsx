import { readFileSync } from 'fs';
import { compileMDX } from 'next-mdx-remote/rsc';
import { join } from 'path';

const components = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="mb-10 text-4xl font-medium tracking-tighter md:mb-12 md:text-5xl md:leading-none lg:text-6xl">
      {children}
    </h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="lg:text-4xxl text-xl leading-snug tracking-tighter md:text-3xl">
      {children}
    </h2>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-muted-foreground/70 mb-8 max-w-4xl leading-relaxed whitespace-pre-wrap">
      {children}
    </p>
  ),
  a: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} className="text-secondary hover:underline">
      {children}
    </a>
  ),
};

export default async function TermsOfService() {
  // Read the MDX file
  const filePath = join(
    process.cwd(),
    './src/app/terms-and-conditions/index.mdx',
  );
  const source = readFileSync(filePath, 'utf8');

  // Compile the MDX content
  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        format: 'mdx',
      },
    },
    components,
  });

  return (
    <section className="section-padding bg-chart-4">
      <div className="container">{content}</div>
    </section>
  );
}

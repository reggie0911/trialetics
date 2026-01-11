'use client';

import { ArrowUpRight } from 'lucide-react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { BlogPost } from '@/lib/blog';
import { cn } from '@/lib/utils';

const categories = [
  'View all',
  'Design',
  'Product',
  'Software Engineering',
  'Customer Success',
];

export interface EnhancedBlogPost extends BlogPost {
  category: string;
  readTime: string;
}

interface BlogClientProps {
  posts: EnhancedBlogPost[];
}

export default function BlogClient({ posts }: BlogClientProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState('View all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isScrolling, setIsScrolling] = useState(false);
  const postsPerPage = 9;
  const { scrollY } = useScroll();

  // Scroll-based animations for featured card
  const imageScale = useTransform(scrollY, [0, 600], [1, 1.15]);

  const filteredPosts = posts
    .filter(
      (post) =>
        selectedCategory === 'View all' || post.category === selectedCategory,
    )
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });

  const featuredPost = posts[0];
  const allRegularPosts = filteredPosts.slice(1);

  // Pagination logic
  const totalPages = Math.ceil(allRegularPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = allRegularPosts.slice(startIndex, endIndex);

  // Update isScrolling state when user scrolls
  useEffect(() => {
    const updateScrollState = () => {
      if (window.scrollY > 5 && !isScrolling) {
        setIsScrolling(true);
      }
    };

    window.addEventListener('scroll', updateScrollState);
    return () => window.removeEventListener('scroll', updateScrollState);
  }, [isScrolling]);

  // Reset to page 1 when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  // Animation variants for featured card
  const featuredContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const featuredItem = {
    hidden: { opacity: 0, y: 30, filter: 'blur(2px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 60,
        damping: 20,
      },
    },
  };

  // Animation variants for individual blog cards
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(3px)',
      scale: 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 25,
        mass: 1,
        duration: 0.6,
      },
    },
  };

  return (
    <section className="section-padding bigger-container overflow-hidden">
      {/* Hero Section */}
      <div className="">
        <h1 className="text-center text-4xl font-medium tracking-tighter md:text-start md:text-6xl md:leading-none lg:text-7xl">
          Blog
        </h1>
        <p className="text-muted-foreground mt-3 hidden text-lg leading-relaxed md:block lg:mt-4">
          Read our latest articles
        </p>

        {featuredPost && (
          <Link href={`/blog/${featuredPost.slug}`} className="group block">
            <motion.div
              className="mt-8 lg:mt-12"
              variants={featuredContainer}
              initial={prefersReducedMotion ? 'visible' : 'hidden'}
              animate="visible"
            >
              {/* Image */}
              <div className="text-border group relative aspect-[16/10] cursor-pointer overflow-hidden rounded-2xl lg:aspect-[16/9]">
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  style={isScrolling ? { scale: imageScale } : {}}
                  layoutId={`cover-image-${featuredPost.slug}`}
                >
                  <Image
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    fill
                    className="rounded-2xl object-cover"
                    priority
                  />
                  <div className="from-foreground/70 absolute inset-0 hidden bg-gradient-to-t to-transparent to-40% md:block" />
                </motion.div>

                {/* Desktop overlay - only shows on md+ */}
                <motion.div
                  className="absolute right-0 bottom-0 left-0 hidden p-8 md:block"
                  variants={featuredContainer}
                  initial={prefersReducedMotion ? 'visible' : 'hidden'}
                  animate="visible"
                >
                  <motion.div
                    className="flex w-full items-center justify-between gap-2"
                    variants={featuredItem}
                  >
                    <h2 className="text-lg leading-tight font-medium md:text-2xl lg:text-3xl">
                      {featuredPost.title}
                    </h2>
                    <ArrowUpRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </motion.div>
                  <motion.p
                    className="mt-1 text-sm md:text-base"
                    variants={featuredItem}
                  >
                    {featuredPost.description}
                  </motion.p>
                  <motion.div
                    className="mt-6 flex items-end justify-between"
                    variants={featuredItem}
                  >
                    <div className="flex gap-8 text-xs">
                      <div className="space-y-2">
                        <div className="font-medium">Written by</div>
                        <div className="flex items-center gap-2">
                          <Image
                            src={featuredPost.author.image}
                            alt={featuredPost.author.name}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                          <span className="font-medium">
                            {featuredPost.author.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div className="font-medium">Published on</div>
                        <div className="flex flex-1 items-center justify-center text-sm font-medium">
                          {new Date(featuredPost.date).toLocaleDateString(
                            'en-GB',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            },
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {featuredPost.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          className="bg-card-foreground capitalize"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* Mobile Content - Shows on mobile */}
              <div className="mt-5 md:hidden">
                <motion.div className="" variants={featuredItem}>
                  <div className="flex flex-wrap gap-2">
                    {featuredPost.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag}
                        className="bg-card-foreground capitalize"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
                <motion.div
                  className="mt-4 flex items-start justify-between gap-2"
                  variants={featuredItem}
                >
                  <h2 className="text-xl leading-tight font-medium">
                    {featuredPost.title}
                  </h2>
                  <ArrowUpRight className="mt-1 h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </motion.div>
              </div>

              {/* Mobile Content - Shows below image on mobile */}
              <div className="mt-2 md:hidden">
                <motion.p
                  className="text-muted-foreground mb-6 text-sm"
                  variants={featuredItem}
                >
                  {featuredPost.description}
                </motion.p>
                <motion.div
                  className="flex items-center gap-4 text-xs"
                  variants={featuredItem}
                >
                  <div className="flex items-center gap-2">
                    <Image
                      src={featuredPost.author.image}
                      alt={featuredPost.author.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium">
                        {featuredPost.author.name}
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(featuredPost.date).toLocaleDateString(
                          'en-GB',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </Link>
        )}
      </div>

      {/* Filter Controls */}
      <div className="mt-14 mb-10 flex flex-col justify-between gap-4 md:mt-16 lg:mt-20 lg:flex-row">
        <div className="w-full overflow-x-auto">
          <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
            <ScrollArea className="pb-2" orientation="horizontal">
              <TabsList className="">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="whitespace-nowrap"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </Tabs>
        </div>

        <div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-background w-full sm:w-[200px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <h2 className="text-4xl font-medium tracking-tighter">
        Read all articles
      </h2>
      {/* Regular Posts Grid */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {currentPosts.map((post) => (
          <motion.div
            key={`${selectedCategory}-${sortBy}-${currentPage}-${post.slug}`}
            variants={cardVariants}
            initial={prefersReducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="h-full"
          >
            <Link href={`/blog/${post.slug}`} className="group block h-full">
              <BlogCard post={post} className="h-full" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      <AnimatePresence>
        {totalPages > 1 && (
          <motion.div
            className="border-input/50 mt-12 flex justify-center border-t pt-4 md:mt-20"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{
              duration: 0.35,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={
                      currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages)
                        setCurrentPage(currentPage + 1);
                    }}
                    className={
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

interface BlogCardProps {
  post: EnhancedBlogPost;
  featured?: boolean;
  className?: string;
}

export function BlogCard({ post, featured = false, className }: BlogCardProps) {
  if (featured) {
    // Featured card is handled separately in the main component
    return null;
  }

  return (
    <Card
      className={cn(
        'group border-input h-full gap-4 overflow-hidden rounded-2xl py-5 shadow-none transition-all duration-200',
        className,
      )}
    >
      <CardHeader className="px-5">
        <motion.div className="relative aspect-[4/3] overflow-hidden rounded-md">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-all duration-300 group-hover:scale-102"
          />
        </motion.div>
      </CardHeader>
      <CardContent className="mb-8 px-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-lg">{post.category}</span>
          <span className="text-muted-foreground">
            {new Date(post.date).toLocaleDateString('en-GB', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <h3 className="text-xl">{post.title}</h3>
      </CardContent>
      <CardFooter className="mt-auto mb-0 flex flex-wrap items-center justify-between gap-2 justify-self-end px-5">
        <span className="text-foreground text-sm font-medium group-hover:underline">
          Read now
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {post.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} className="bg-card-foreground capitalize">
              {tag}
            </Badge>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}

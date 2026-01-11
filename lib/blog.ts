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

// Static blog posts for demo purposes
const DEMO_AUTHOR: Author = {
  name: 'Trialetics Team',
  image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
  facebookUrl: '#',
  twitterUrl: '#',
  linkedinUrl: '#',
};

const DEMO_POSTS: BlogPost[] = [
  {
    slug: 'getting-started-with-trialetics',
    title: 'Getting Started with Trialetics',
    description: 'Learn how to set up and configure Trialetics for your team in just a few minutes.',
    date: '2026-01-10',
    author: DEMO_AUTHOR,
    tags: ['Product', 'Tutorial'],
    content: 'Welcome to Trialetics! This guide will help you get started...',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
  },
  {
    slug: 'best-practices-for-project-management',
    title: 'Best Practices for Project Management',
    description: 'Discover proven strategies to manage your projects more effectively.',
    date: '2026-01-08',
    author: DEMO_AUTHOR,
    tags: ['Design', 'Best Practices'],
    content: 'Project management is essential for team success...',
    coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
  },
  {
    slug: 'team-collaboration-tips',
    title: 'Team Collaboration Tips for Remote Teams',
    description: 'How to keep your remote team connected and productive.',
    date: '2026-01-05',
    author: DEMO_AUTHOR,
    tags: ['Software Engineering', 'Remote Work'],
    content: 'Remote work has become the new normal...',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
  },
  {
    slug: 'customer-success-strategies',
    title: 'Customer Success Strategies That Work',
    description: 'Build lasting relationships with your customers using these proven strategies.',
    date: '2026-01-03',
    author: DEMO_AUTHOR,
    tags: ['Customer Success', 'Growth'],
    content: 'Customer success is about more than just support...',
    coverImage: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop',
  },
];

export function getAllBlogs(limit?: number): BlogPost[] {
  const posts = DEMO_POSTS.sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return limit ? posts.slice(0, limit) : posts;
}

export function getBlogBySlug(slug: string): BlogPost | undefined {
  return DEMO_POSTS.find(post => post.slug === slug);
}

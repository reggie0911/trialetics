// import fs from 'fs';
// import matter from 'gray-matter';
// import path from 'path';

// import { Post } from '@/types/post';

// const postsDirectory = path.join(process.cwd(), 'src/_posts');

// export function getPostSlugs() {
//   return fs.readdirSync(postsDirectory);
// }

// export function getPostBySlug(slug: string) {
//   const realSlug = slug.replace(/\.md$/, '');
//   const fullPath = path.join(postsDirectory, `${realSlug}.md`);
//   const fileContents = fs.readFileSync(fullPath, 'utf8');
//   const { data, content } = matter(fileContents);

//   return {
//     slug: realSlug,
//     title: data.title,
//     date: data.date,
//     coverImage: data.coverImage,
//     author: data.author,
//     excerpt: data.excerpt,
//     content,
//   } as Post;
// }

// export function getAllPosts(): Post[] {
//   const slugs = getPostSlugs();
//   const posts = slugs
//     .map((slug) => getPostBySlug(slug))
//     .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
//   return posts;
// }

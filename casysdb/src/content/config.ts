import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    slug: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    authors: z.array(z.string()).optional(),
    date: z.date(),
    publishedAt: z.date().optional(),
    updatedAt: z.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});
export const collections = {
  blog,
};

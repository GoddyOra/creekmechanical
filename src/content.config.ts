import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    targetKeyword: z.string(),
    // TODO(user): set a real byline once you give one — see CLAUDE.md.
    author: z.string().default('Creek Mechanical'),
    publishDate: z.date(),
    updatedDate: z.date().optional(),
    funnelsTo: z
      .array(z.object({ href: z.string(), label: z.string() }))
      .default([])
  })
});

export const collections = { guides };

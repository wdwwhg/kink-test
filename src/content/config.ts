import { defineCollection, z } from "astro:content";

const guides = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    order: z.number(),
    image: z.object({
      src: z.string().regex(/^\/images\/[a-z0-9-]+\.svg$/),
      socialSrc: z.string().regex(/^\/images\/[a-z0-9-]+\.png$/),
      alt: z.string().min(40).max(180),
    }),
  }),
});

export const collections = {
  guides,
};

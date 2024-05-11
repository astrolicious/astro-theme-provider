import { collections as themeCollections } from 'theme-playground:collections'
import { z } from 'astro:content';

export const collections = {
  blog: themeCollections.blog({
    extends: z.object({
      test: z.boolean()
    })
  })
};
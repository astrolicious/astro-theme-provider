import { defineCollection, z } from "@it-astro:content";

export const collections = {
	blog: defineCollection({
		schema: z.object({
			title: z.string(),
		}),
	}),
};

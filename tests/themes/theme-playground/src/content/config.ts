import { defineCollection, z } from "theme-playground:content";

export const collections = {
	blog: defineCollection({
		schema: z.object({
			title: z.string(),
		}),
	}),
};

import { z, defineCollection } from 'theme-ssg:content';

export const collections = {
	blog: defineCollection({
		schema: z.object({
			title: z.string()
		})
	})
}
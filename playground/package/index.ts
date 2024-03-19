import defineTheme from "astro-theme-provider";
import { z } from "astro/zod";

export default defineTheme({
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
	}),
});

import defineTheme from "astro-theme-provider";
import { z } from "astro/zod";

export default defineTheme({
	name: "theme-ssg",
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
	}),
	imports: {
		test: {
			default: "./src/components/Heading.astro",
		},
	},
});

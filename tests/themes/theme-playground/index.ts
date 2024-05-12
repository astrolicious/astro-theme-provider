import defineTheme from "astro-theme-provider";
import { z } from "astro/zod";
import sitemap from "@astrojs/sitemap"

const schema = z.object({
	title: z.string(),
	description: z.string().optional(),
	sitemap: z.boolean().optional().default(true)
})

type TTT = z.input<typeof schema>

export default defineTheme({
	name: "theme-playground",
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		sitemap: z.boolean().optional().default(true)
	}),
	imports: {
		test: {
			default: "./src/components/Heading.astro",
		},
	},
	integrations: [
		({ config }) => config.sitemap && sitemap()
	]
});

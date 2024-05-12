import { createResolver } from "astro-integration-kit";
import { hmrIntegration } from "astro-integration-kit/dev";
import { defineConfig } from "astro/config";

const { default: themePlayground } = await import("theme-playground");

export default defineConfig({
	integrations: [
		themePlayground({
			config: {
				title: "Hey!",
				description: "This is a theme created using",
				// sitemap: false
			},
			pages: {
				// '/cats': '/dogs',
				// '/cats/[...cat]': '/dogs/[...cat]',
			},
			overrides: {
				components: {
					// Heading: './src/CustomHeading.astro'
				},
				styles: [
					// "./src/custom.css"
				],
			},
			integrations: {
				'@astrojs/sitemap': false
			}
		}),
		hmrIntegration({
			directory: createResolver(import.meta.url).resolve("../package/dist"),
		}),
	],
});

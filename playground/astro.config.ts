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
			},
			pages: {
				// '/cats': '/dogs',
				// '/cats/[...cat]': '/dogs/[...cat]',
			},
			overrides: {
				styles: [
					// "./src/custom.css"
				],
				components: {
					// Heading: './src/CustomHeading.astro'
				},
			},
		}),
		hmrIntegration({
			directory: createResolver(import.meta.url).resolve("../package/dist"),
		}),
	],
});

import { defineConfig } from "astro/config";
import Theme from "theme-playground";

export default defineConfig({
	integrations: [
		Theme({
			config: {
				title: "Hello!",
				description: "Welcome",
			},
		}),
	],
});

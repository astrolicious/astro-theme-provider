import { defineConfig } from "astro/config";
import Theme from "theme-ssg";

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

import { defineConfig } from "astro/config";
import Theme from "theme-ssg";
import config from './config'

export default defineConfig({
	integrations: [
		Theme({
			config,
		}),
	],
});

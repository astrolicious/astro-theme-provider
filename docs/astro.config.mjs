import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			customCss: ["./src/css/styles.css"],
			title: "Astro Theme Provider",
			social: {
				github: "https://github.com/BryceRussell/astro-theme-provider",
			},
			sidebar: [
				{
					label: "Introduction",
					autogenerate: { directory: "introduction" },
				},
				// {
				// 	label: "Authoring a Theme",
				// 	badge: {
				// 		text: "WIP",
				// 		variant: 'caution'
				// 	},
				// 	link: "/authoring-a-theme",
				// },
				// {
				// 	label: "Using a Theme",
				// 	badge: {
				// 		text: "WIP",
				// 		variant: 'caution'
				// 	},
				// 	link: "/using-a-theme",
				// },
				{
					label: "Reference",
					autogenerate: { directory: "reference" },
				},
			],
		}),
	],
});

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			customCss: ["./src/styles/global.css"],
			title: "Astro Theme Provider",
			social: {
				github: "https://github.com/astrolicious/astro-theme-provider",
			},
			sidebar: [
				{
					label: "Introduction",
					autogenerate: { directory: "introduction" },
				},
				{
					label: "Authoring a Theme",
					badge: {
						text: "Coming Soon",
						variant: "success",
					},
					link: "#",
					attrs: {
						style: "opacity:0.5",
					},
				},
				{
					label: "Using a Theme",
					badge: {
						text: "Coming Soon",
						variant: "success",
					},
					link: "#",
					attrs: {
						style: "opacity:0.5",
					},
				},
				{
					label: "Reference",
					autogenerate: { directory: "reference" },
				},
			],
		}),
	],
});

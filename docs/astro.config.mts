import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { packageVersion } from "./src/utils";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			customCss: ["./src/styles/global.css"],
			title: "Astro Theme Provider",
			social: {
				discord: "https://chat.astrolicious.dev/",
				github: "https://github.com/astrolicious/astro-theme-provider",
			},
			sidebar: [
				{
					label: "Introduction",
					items: [
						{
							label: "Why?",
							link: "/why",
						},
						{
							label: "Core Concepts",
							link: "/core-concepts",
						},
						{
							label: "Getting Started",
							link: "/getting-started",
						},
					]
				},
				{
					label: "Conventions and Techniques",
					items: [
						{
							label: "Theme Configurations",
							link: "#",
						},
						{
							label: "Styling a Theme",
							link: "#",
						},
						{
							label: "Authoring Routes",
							link: "#",
						},
						{
							label: "Authoring Components",
							link: "#",
						},
						{
							label: "Client Scripts & Frameworks",
							link: "#",
						},
						// {
						// 	label: "Integration Wrappers",
						// 	link: "#",
						// 	badge: {
						// 		text: "Advanced",
						// 		variant: "caution",
						// 	}
						// },
					],
				},
				{
					label: "Reference",
					items: [
						{
							label: "Author API",
							link: "/reference/author",
						},
						{
							label: "User API",
							link: "/reference/user",
						},
					]
				},
				{
					label: "Upgrade Guide",
					link: "/upgrade-guide",
				},
				{
					label: `v${packageVersion} Changelog ↗`,
					link:
						`https://github.com/astrolicious/astro-theme-provider/blob/main/package/CHANGELOG.md#${packageVersion.replaceAll(".", "")}`,
					attrs: {
						target: "_blank",
					},
				},
				{
					label: "Need help? ↗",
					link: "https://discord.com/channels/1217527207467946087/1217544309226733779"
				},
			],
		}),
	],
});

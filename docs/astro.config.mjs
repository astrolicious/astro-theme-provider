import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Astro Theme Provider',
			social: {
				github: 'https://github.com/BryceRussell/astro-theme-provider',
			},
			sidebar: [
				{
					label: 'Introduction',
					items: [
						{ label: 'Why?', link: '/introduction#why' },
						{ label: 'How it Works', link: '/introduction#how-it-works' }
					]
				},
				{
					label: 'Authoring a Theme',
					autogenerate: { directory: 'author' },
				},
				{
					label: 'Using a Theme',
					autogenerate: { directory: 'user' },
				},
			],
		}),
	],
});

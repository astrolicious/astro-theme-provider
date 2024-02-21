# `astro-theme-provider`

Easily create theme integrations for Astro

### [Documentation](https://astro-theme-provider.netlify.app)

### [Package](packages/astro-theme-provider)

```ts
import defineTheme from 'astro-theme-provider';
import { z } from 'astro/zod'

export default defineTheme({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  })
})
```

```ts
import { defineConfig } from 'astro/config';
import MyTheme from 'my-theme';

export default defineConfig({
	integrations: [
		MyTheme({
			config: {
				title: "Hey!",
				description: "This is a theme created using",
			},
			pages: {
        '/404': false, // Toggle routes off
				'/blog': '/projects', // Overwrite routes
			},
			overrides: {
				css: [
					"./custom.css" // Add custom css
				],
				components: {
					Heading: './CustomHeading.astro' // Overwrite theme assets
				},
			},
		}),
	],
});
```

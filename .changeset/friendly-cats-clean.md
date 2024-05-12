---
"astro-theme-provider": minor
---

Added a user facing API for disabling integrations injected by a theme

```ts
import { defineConfig } from "astro/config";
import myTheme from 'my-theme'

export default defineConfig({
	integrations: [
		myTheme({
			integrations: {
				'@astrojs/sitemap': false
			}
		}),
	],
});
```
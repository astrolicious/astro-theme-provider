---
"astro-theme-provider": minor
---

Added a built in virtual module for integration utilities. Includes a utility to query what integrations are added to a theme:

```astro
---
import { integrations } from 'my-theme:integrations'

if (integrations.has('@inox-tools/sitemap-ext')) {
	import('sitemap-ext:config').then((sitemap) => {
			sitemap.default(true)
	})
}
---
```
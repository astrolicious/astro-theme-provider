---
"astro-theme-provider": minor
---

Added a utility to query what integrations are inside the project:

```astro
---
import { integrations } from 'my-theme:context'

if (integrations.has('@inox-tools/sitemap-ext')) {
	import('sitemap-ext:config').then((sitemap) => {
			sitemap.default(true)
	})
}
---
```
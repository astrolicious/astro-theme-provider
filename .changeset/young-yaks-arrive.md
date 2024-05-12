---
"astro-theme-provider": minor
---

Added a built in virtual module for integration utilities. Includes a utility to query what integrations are inside the project:

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

The virtual module name `my-theme:integrations` is now reserved, users can no longer create custom virtual modules with this name
---
"astro-theme-provider": minor
---

Added the ability for themes to seed content collections and inject schemas into a user's project using [`@inox-tools/content-utils`](https://www.npmjs.com/package/@inox-tools/content-utils), thanks @Fryuni!

```
package/
└── src/
    └── content/
        ├── myBlog/
        │   └── example.md
        └── config.ts
```

```ts
// package/src/content/config.ts

import { z, defineCollection } from 'my-theme:content';

export const collections = {
	myBlog: defineCollection({
		schema: z.object({
			title: z.string()
		})
	})
}
```

All collection schemas defined inside `package/src/content/config.ts` are injected into a user's project.

All collection directories inside `package/src/content/` will be seeded (copied) to a user's project if the collection directory does not exist
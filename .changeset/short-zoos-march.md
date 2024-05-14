---
"astro-theme-provider": minor
---

Added a utility to query the final path of a page:

```astro
---
import { pages } from 'my-theme:context'
---

{ pages.has('/blog') &&
  <a href={pages.get('/blog')}>Blog</a>
}
```
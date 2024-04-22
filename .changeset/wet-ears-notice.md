---
"astro-theme-provider": minor
---

Moved the default location of the public dir to the root of a theme

```diff
  package/
+ ├── public
  ├── src/
- │   ├── public
  │   └── ...
  └── ...
```

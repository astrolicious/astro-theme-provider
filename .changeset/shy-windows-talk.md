---
"astro-theme-provider": minor
---

Added a built in virtual module for theme utilities `<name>:context`.

This name is now reserved, authors can no longer create custom virtual modules with this name, example:

```diff
  defineTheme({
    imports: {
-     context: {
+     options: {
        // ...
      }
    }
  })
```
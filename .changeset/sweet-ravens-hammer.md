---
"astro-theme-provider": minor
---

Updated root directory for glob modules, glob patterns are now relative to a theme's `srcDir`

```diff
 imports: {
-  css: '**.css'
+  css: 'css/**.css'
 }
```
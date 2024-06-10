---
"astro-theme-provider": patch
---

Added an option for theme authors to toggle the public directory off:

```ts
defineTheme({
	name: 'my-theme',
	publicDir: false
})
```
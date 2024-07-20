---
"astro-theme-provider": minor
---

Added the ability for theme authors to toggle the public directory off:

```ts
defineTheme({
	name: 'my-theme',
	publicDir: false
})
```
---
"astro-theme-provider": minor
---

Add support for adding middleware to a theme

```
package/
├── src/
│   ├── middleware.ts  // Support middleware like Astro, defaults to 'pre'
│   └── middleware/
│       ├── index.ts   // Same as `src/middleware.ts`
│       ├── pre.ts     // Middleware with order 'pre'
│       └── post.ts    // Middleware with order 'post'
└── index.ts
```

```ts
defineTheme({
  name: 'my-theme',
  middlewareDir: false // Disable middleware injection
})
```
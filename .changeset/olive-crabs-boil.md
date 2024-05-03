---
"astro-theme-provider": minor
---

Add support for adding integrations to a theme

```ts
integrations: [
  // Add integrations
  inoxsitemap(),
  // Check for other integrations
  ({ integrations }) => {
    if (!integrations.contains('@astrojs/sitemap')) {
      return inoxsitemap()
    }
  },
  // Pass user options to integrations
  ({ config }) => {
    if (config.sitemap) {
      return inoxsitemap(config.sitemap)
    }
  },
]
```
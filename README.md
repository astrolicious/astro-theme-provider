# `astro-theme-provider`

[![npm version](https://img.shields.io/npm/v/astro-theme-provider?labelColor=red&color=grey)](https://www.npmjs.com/package/astro-theme-provider)
![beta](https://img.shields.io/badge/Beta-orange)

Author themes for Astro like a normal project and export your work as an integration for others to use

### [Documentation](https://astro-theme-provider.netlify.app)

### [Theme Template](https://github.com/astrolicious/astro-theme-provider-template)


### Contributing

- [Contributing Guide](https://github.com/astrolicious/astro-theme-provider/blob/main/CONTRIBUTING.md)
- [Discord Channel](https://chat.astrolicious.dev)
- [Discussions](https://github.com/astrolicious/astro-theme-provider/discussions)
- [Issues](https://github.com/astrolicious/astro-theme-provider/issues)

### Example

**Authoring a Theme**:

```
package/
├── public/
├── src/
│   ├── assets/
│   ├── css/
│   ├── components/
│   ├── layouts/
│   └── pages/
├── index.ts
└── package.json
```

```ts
// package/index.ts
import defineTheme from 'astro-theme-provider';
import { z } from 'astro/zod'

export default defineTheme({
  schema: z.object({
    title: z.string(),
  })
})
```

**Using a Theme**:

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import Blog from 'blog-theme';

export default defineConfig({
  integrations: [
    Blog({
      config: {
        title: "My Blog"
      },
      pages: {
        '/404': false, // Toggle routes off
        '/blog': '/projects', // Overwrite routes
      },
      overrides: {
        css: [
          "./src/custom.css" // Add custom css
        ],
        components: {
          Hero: './src/Custom.astro' // Overwrite theme assets
        },
      },
    }),
  ],
});
```

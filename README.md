# `astro-theme-provider`

[![npm version](https://img.shields.io/npm/v/astro-theme-provider?labelColor=red&color=grey)](https://www.npmjs.com/package/astro-theme-provider)
![beta](https://img.shields.io/badge/WIP-orange)
[![readme](https://img.shields.io/badge/README-blue)](package)
[![template](https://img.shields.io/badge/Theme_Template-green)](https://github.com/BryceRussell/astro-theme-template)

Easily create theme integrations for Astro

### [Documentation](https://astro-theme-provider.netlify.app)

### Example

**Authoring a Theme**:

```ts
import defineTheme from 'astro-theme-provider';
import { z } from 'astro/zod'

export default defineTheme({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  })
})
```

**Using a Theme**:

```ts
import { defineConfig } from 'astro/config';
import MyTheme from 'my-theme';

export default defineConfig({
  integrations: [
    MyTheme({
      config: {
        title: "Hey!",
        description: "This is a theme integration!",
      },
      pages: {
        '/404': false, // Toggle routes off
        '/blog': '/projects', // Overwrite routes
      },
      overrides: {
        css: [
          "./custom.css" // Add custom css
        ],
        components: {
          Heading: './CustomHeading.astro' // Overwrite theme assets
        },
      },
    }),
  ],
});
```
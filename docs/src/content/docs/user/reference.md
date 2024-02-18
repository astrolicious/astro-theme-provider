---
title: Reference
description: Aute est nulla voluptate sint voluptate consectetur Lorem nisi.
---

## Example

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config';
import MyTheme from 'my-theme';

export default defineConfig({
  integrations: [
    MyTheme({
      config: {
        title: 'Hey!',
        description: 'This is my theme',
      },
      pages: {
        '/blog': false, // Toggle route off
        '/blog/[...slug]': '/projects/[...slug]', // Override path
      },
      overrides: {
        css: [
          "./custom.css" // Add custom css to theme
        ],
        components: {
          // Overwrite default Heading component with a custom one
          Heading: './CustomHeading.astro'
        }
      }
    })
  ]
});
```
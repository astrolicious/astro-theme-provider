# astro-theme-provider

## 0.6.1

### Patch Changes

- cb2bbd3: Fix error for theme's that do not have a `public` directory

## 0.6.0

### Minor Changes

- 0d49101: Fixed circular import case when overriding components, for example:

  ```tsx
  // src/CustomButton.astro
  ---
  import { Button } from 'my-theme:components';
  ---

  <Button>
    I am custon text
  </Button>
  ```

  ```tsx
  import { defineConfig } from "astro/config";
  import myTheme from "my-theme";

  export default defineConfig({
    integrations: [
      myTheme({
        overrides: {
          components: {
            Button: "./src/CustomButton.astro",
          },
        },
      }),
    ],
  });
  ```

- 0d49101: Simplified generated types and removed extra types that are not being used internally.
- 8ecb96d: Change type for theme integrations from `AstroDbIntegration` to `AstroIntegration`
- f604446: Added the ability for theme authors to toggle the public directory off:

  ```ts
  defineTheme({
    name: "my-theme",
    publicDir: false,
  });
  ```

## 0.5.0

### Minor Changes

- 5188e12: Added a user facing API for disabling integrations injected by a theme

  ```ts
  import { defineConfig } from "astro/config";
  import myTheme from "my-theme";

  export default defineConfig({
    integrations: [
      myTheme({
        integrations: {
          "@astrojs/sitemap": false,
        },
      }),
    ],
  });
  ```

- 5188e12: Updated the type of the user config to `z.input` instead of `z.infer` for proper typing
- cfcdca1: Added a utility to query the final path of a page:

  ```astro
  ---
  import { pages } from 'my-theme:context'
  ---

  { pages.has('/blog') &&
    <a href={pages.get('/blog')}>Blog</a>
  }
  ```

- 5188e12: Added a built in virtual module for theme utilities `<name>:context`.

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

- 5188e12: Added a utility to query what integrations are inside the project:

  ```astro
  ---
  import { integrations } from 'my-theme:context'

  if (integrations.has('@inox-tools/sitemap-ext')) {
  	import('sitemap-ext:config').then((sitemap) => {
  			sitemap.default(true)
  	})
  }
  ---
  ```

## 0.4.0

### Minor Changes

- b1947f8: Change virtual module separator from `/` to `:`.

  ```diff
  - import "my-theme/styles"
  + import "my-theme:styles"
  ```

- b1947f8: Renamed `/css` directory to `/styles`. Change imports as:

  ```diff
  - import "my-theme:css"
  + import "my-theme:styles"
  ```

## 0.3.0

### Minor Changes

- 0388fd8: Add support for adding integrations to a theme

  ```ts
  integrations: [
    // Add integrations
    inoxsitemap(),
    // Check for other integrations
    ({ integrations }) => {
      if (!integrations.contains("@astrojs/sitemap")) {
        return inoxsitemap();
      }
    },
    // Pass user options to integrations
    ({ config }) => {
      if (config.sitemap) {
        return inoxsitemap(config.sitemap);
      }
    },
  ];
  ```

- f66b214: Add support for adding middleware to a theme

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
    name: "my-theme",
    middlewareDir: false, // Disable middleware injection
  });
  ```

## 0.2.0

### Minor Changes

- 1a40dfd: Fixed typing for theme integrations, `name` property is now required again
- 9655a45: Added a `log` option for theme authors

  - `false`: No logging
  - `"minimal" | true`: Default logging, includes warnings
  - `"verbose"`: Log everything, including debug information like page injection and static asset handling

  Fixed warnings for a missing README throwing errors if README did not exist

- ca1f3b3: Updated root directory for glob modules, glob patterns are now relative to a theme's `srcDir`

  ```diff
   imports: {
  -  css: '**.css'
  +  css: 'css/**.css'
   }
  ```

- 12b5819: Moved the default location of the public dir to the root of a theme

  ```diff
    package/
  + ├── public
    ├── src/
  - │   ├── public
    │   └── ...
    └── ...
  ```

### Patch Changes

- b503fed: Upgrade to `astro-integration-kit` 0.11.0, package HMR is now only applied inside the playground

## 0.1.2

### Patch Changes

- b189ddf: Fixed package names having priority over manually defined names for the theme name
- b189ddf: Theme configs are now optional
- b189ddf: Upgrade dep

## 0.1.1

### Patch Changes

- 54bfa24: Add support for `@astrojs/db` (Astro Studio)
- 1bdf366:
  - Update author option `modules` to `imports`
  - Added support for `default` exports for virtual modules
- 9227ddf:
  - Add a `/src` directory for themes for better organization
  - Update author options:
    - Added `srcDir` option
    - Updated `pages` to `pageDir`
    - Updated `public` to `publicDir`
    - `schema` is not required and is no longer limited to just objects

## 0.1.0

### Major refactor

- Migrated to Astro Integration Kit utilities (`watchIntegration`, `addVirtualImports`, `addDts`)
- 38e6289: Add support for `/public` folder
- Added ability to dynamically create virtual modules (previously static)
- Added automatic type generation for virtual modules
- Added support for a file-based routing directory `/pages` to replace the `entrypoint` option
- Infer theme name from package name
- Removed `virtual:` prefix for virtual imports
- Removed `context` module

# astro-theme-provider

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

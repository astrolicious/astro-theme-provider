# astro-theme-provider

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


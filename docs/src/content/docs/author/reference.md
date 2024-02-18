---
title: Reference
description: Occaecat culpa culpa labore nulla ut et voluptate est occaecat aliqua aliquip esse do anim.
---


```ts
// package/index.ts
import defineTheme from 'astro-theme-provider';

export default defineTheme({
  // ...
})
```

## Author Options

### name

**Type**: `string` | `undefined`

The name of your theme integration. This property is infered from the `name` property inside your package's `package.json`. It is reccomended to leave this value alone and allow the provider to infer your package's name.

### entrypoint

**Type**: `string` | `undefined`

A path to the root directory (or file inside root directory) of your theme package. This property is infered automatically, it is reccomended to leave this value alone.

### schema

**Type**: [`ZodObject`](https://zod.dev/?id=objects)

A zod object schema for validating a user's theme configuration. The validated config can be accessed by the Theme author using the virtual module `/config` (`my-theme/config`)

```ts
schema: z.object({
  title: z.string(),
  description: z.string().optional()
})
```

### pages

**Type**: `string` | [`AstroPagesOption`](https://github.com/BryceRussell/astro-pages/blob/main/package/README.md#option-reference)

**Default**: `pages`

### modules

**Type**: `Record<string, string>` | `string` | `false` | `null` | `undefined`

**Default**:

```js
{
  css: "**.{css,scss,sass,styl,less}",
  assets: "**.{jpeg,jpg,png,tiff,webp,gif,svg,avif}",
  layouts: "**.astro",
  components: "**.{astro,tsx,jsx,svelte,vue}"
}
```

## Example
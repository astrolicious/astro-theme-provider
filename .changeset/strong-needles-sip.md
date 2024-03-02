---
"astro-theme-provider": patch
---

**Upgrade deps**:
- `astro-integration-kit`: `0.5.0` - Themes should now be (_slightly_) faster, now only one Vite plugin is used to resolve imports instead of creating a new plugin for every import `my-theme/css`, `my-them/assets`, etc
- `astro-pages`: `0.2.0` - Now supports Astro 3.0 or less, `astro-theme-provider` may be able to support older versions?
- Upgrade dev dependencies `astro` and `@types/node`
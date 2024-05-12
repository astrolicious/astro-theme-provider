---
"astro-theme-provider": minor
---

Updated the type for the user config to use `z.input` instead of `z.infer`. This allows authors to use optional schemas with a default value, ex: `z.boolean().optional().default(true)`

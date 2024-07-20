---
"astro-theme-provider": minor
---

Fixed circular import case when overriding components, for example:

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
          Button: './src/CustomButton.astro'
        },
      },
    }),
  ],
});
```
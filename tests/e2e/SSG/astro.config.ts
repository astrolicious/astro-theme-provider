import { defineConfig } from 'astro/config';
import myTheme from 'my-theme'

// https://astro.build/config
export default defineConfig({
  integrations: [
    myTheme({
      config: {
        title: "Hello!",
        description: "welcome"
      }
    })
  ]
});

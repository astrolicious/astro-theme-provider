import { defineConfig } from 'astro/config';
import MyTheme from 'my-theme';

export default defineConfig({
  integrations: [
    MyTheme({
      config: {
        title: 'My title from config',
        description: 'This is a description',
      },
      pages: {
        // '/cats': '/dogs',
      },
      overrides: {
        css: [],
        components: {
          Heading: './src/CustomHeading.astro'
        }
      }
    })
  ]
});


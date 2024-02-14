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
        '/blog': '/base',
      },
      overrides: {
        css: ["test"],
        components: {
          Navbar: './src/CustomHeading.astro'
        }
      }
    })
  ]
});


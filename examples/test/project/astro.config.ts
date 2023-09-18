import { defineConfig } from 'astro/config';
import MyTheme from 'my-theme';

export default defineConfig({
  integrations: [
    MyTheme({
      config: {
        title: 'My title from config',
        description: 'This is a description',
        social: {
          github: 'link'
        },
      },
      exports: {
        // Add custom css, makes all text red
        // css: ['/src/custom.css'], 
        components: {
          // Override components
          // Heading: '/src/CustomHeading.astro'
        }
      }
    })
  ]
});


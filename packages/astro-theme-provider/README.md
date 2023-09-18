# `astro-theme-provider`

## Why?

Most Astro themes are repos that you have to clone and edit yourself. They often times feel bloated, complicated, and have files that you dont necessarily need to see or touch. `astro-theme-provider` allows you to export your theme as an integration from a npm package that can be configured from inside the Astro config.

## How does it work?

The basic idea is that you can configure the theme provider to expose an Astro integration that creates virtual modules for everything you need to build your theme

```ts
// Snapshot of the Astro config when theme integration loads
import context from 'virtual:my-theme/context';

// A config object defined by the theme author that is validated by zod
import config from 'virtual:my-theme/config';

// Components and Assets that can be overwritten by the user
import { Layout } from 'virtual:my-theme/components';
import { logo } from 'virtual:my-theme/assets';

// A CSS import that the user can append stylesheets to
import 'virtual:my-theme/css';
```



## How to Use

### Authoring a Theme

####  Configure the theme provider



```ts
import ThemeProvider from 'astro-theme-provider';
import { z } from 'astro/zod'

const configSchema = z.object({
  title: z.string(),
  description: z.string(),
})

export type MyThemeConfig = z.infer<typeof configSchema>

export default ThemeProvider({
  name: 'my-theme',
  configSchema,
  entryPoints: {
    '/': 'my-theme/pages/index.astro',
    '404': 'my-theme/pages/404.astro'
  },
  exports: {
    css: ['my-theme/styles/styles.css'],
    components: {
      Layout: 'my-theme/layouts/Layout.astro',
      Heading: 'my-theme/components/Heading.astro'
    },
    assets: {
      logo: 'my-theme/assets/logo.png'
    }
  }
})
```

#### Use virtual modules to build pages, layouts, and components

```tsx
// my-theme/pages/index.astro
---
import { Image } from 'astro:assets';
import { Layout }  from 'virtual:my-theme/components';
import { logo } from 'virtual:my-theme/assets';
import 'virtual:my-theme/css';
---

<Layout>
  <Heading />
  <Image src={logo} alt="logo"/>
</Layout>
```

```tsx
// my-theme/components/Heading.astro
---
import config from 'virtual:my-theme/config'

interface Props {
  title?: string;
  description?: string;
}

const { title, description } = Astro.props
---

<header>
  { Astro.slots.has('default')
    && Astro.slots.render('default')
    || <h1>{config.title || 'My Theme Title'}</h1>
  }
  { Astro.slots.has('description')
    && Astro.slots.render('description')
    || <p>{config.description || 'This is a description'}</p>
  }
</header>
```

### Using the Theme

#### Import and configure theme in Astro config

```ts
import { defineConfig } from 'astro/config';
import MyTheme from 'my-theme';

export default defineConfig({
  integrations: [
    MyTheme({
      config: {
        title: 'My title from config',
        description: 'This is a description',
      },
      exports: {
        // Add custom css
        css: ['/src/custom.css'],
        // Customize theme by overriding components/assets
        components: {
          Head: '/src/CustomHeading.astro'
        },
        assets: {
          logo: '/src/my-logo.png'
        }
      }
    })
  ]
});
```

#### Customize theme by overriding components

```tsx
/// /src/CustomHeading.astro
---
import Heading from 'my-theme/components/Heading.astro'
---

<Heading>
  <h1>This is a custom Title using slots</h1>
</Heading>
```
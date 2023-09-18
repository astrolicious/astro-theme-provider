import ThemeProvider from 'astro-theme-provider';
import { z } from 'astro/zod'

const configSchema = z.object({
  title: z.string(),
  description: z.string(),
  social: z.object({
    github: z.string().optional(),
    twitter: z.string().optional(),
    mastadon: z.string().optional(),
  })
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
    css: ['my-theme/styles/reset.css'],
    components: {
      Layout: 'my-theme/layouts/Layout.astro',
      Heading: 'my-theme/components/Heading.astro'
    },
    assets: {
      avatar: 'my-theme/assets/avatar-placeholder.png'
    }
  }
})



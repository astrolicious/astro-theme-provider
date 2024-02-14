import ThemeProvider from 'astro-theme-provider';
import { z } from 'astro/zod'

export default ThemeProvider({
  entrypoint: import.meta.url,
  name: 'my-theme',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  })
})
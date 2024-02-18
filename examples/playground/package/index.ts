import ThemeProvider from 'astro-theme-provider';
import { z } from 'astro/zod'

export default ThemeProvider({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
  modules: {
    components: {
      Heading: './Heading.astro'
    }
  }
})
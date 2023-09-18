
import type { AstroUserConfig, AstroIntegration } from 'astro';
import type { ExportTypes, AuthorConfigTypes, UserConfigTypes } from './types';
import { ThemeProviderUserConfigSchema, errorMap } from './schema';
import { vitePluginThemeProvider } from './virtual';

export default function ThemeProviderIntegration<AuthorConfig, AuthorExports extends ExportTypes>(authorOptions: AuthorConfigTypes<AuthorConfig, AuthorExports>) {
  return function(userOptions: UserConfigTypes<AuthorConfig, AuthorExports>): AstroIntegration {

    let userSchema = ThemeProviderUserConfigSchema<AuthorConfig, AuthorExports>(authorOptions)
    
    const parsedUserConfig = userSchema.safeParse(userOptions, { errorMap });

    if (!parsedUserConfig.success) {
      throw new Error(
        `Invalid configuration passed to '${authorOptions.name}' integration\n` +
          parsedUserConfig.error.issues.map((i) => i.message).join('\n')
      );
    }
  
    const userConfig = parsedUserConfig.data;

    console.log(userConfig)

    return {
      name: authorOptions.name,
      hooks: {
        'astro:config:setup': ({ config, updateConfig, injectRoute }) => {
          for (const [pattern, entryPoint] of Object.entries(authorOptions.entryPoints)) {
            injectRoute({ pattern, entryPoint})
          }
          const addToConfig: AstroUserConfig = {
            vite: {
              plugins: [vitePluginThemeProvider<AuthorConfig, AuthorExports>(authorOptions, userConfig, config)]
            }
          }
          updateConfig(addToConfig)
        }
      }
    }
  }
}



import { type Option as PageDirOption } from 'astro-pages/types';
import { AstroError } from "astro/errors";
import { z } from 'astro/zod';
import { readFileSync } from "node:fs";
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url'
import { defineIntegration, defineOptions } from "astro-integration-kit";
import { watchIntegrationPlugin, addVirtualImportPlugin } from "astro-integration-kit/plugins";
import addPageDirPlugin from 'astro-pages/plugins/astro-integration-kit.ts';
// @ts-ignore
import validatePackageName from 'validate-npm-package-name';
import addDtsBufferPlugin from './plugins/d-ts-buffer'
import { errorMap } from './error-map';
import { GLOB_ASTRO, GLOB_CSS, GLOB_IMAGES, LineBuffer, camelCase, globToModule, isAbsoluteFile, isCSSFile, isImageFile, validateDirectory, validateFile, validatePattern, wrapWithBrackets } from './utils'
import callsites from 'callsites';

type Prettify<T> = { [K in keyof T]: T[K]; } & {};

type ConfigDefault = Record<string, unknown>

type ExportTypes = Record<string, undefined | null | false | string | string[] | Record<string, string>>

type AuthorOptions<
  Config extends ConfigDefault
> = Prettify<{
  entrypoint?: string;
  name?: ThemeName;
  pages?: string | PageDirOption | undefined;
  schema: z.ZodSchema<Config>;
  modules?: ExportTypes | undefined
}>

type UserOptions<
  Config extends ConfigDefault, 
> = Prettify<{
  config: Config;
  pages?: AstroThemePagesOptions<ThemeName> | undefined
  overrides?: AstroThemeModulesOptions<ThemeName> | undefined;
}>

const thisFile = validateFile(import.meta.url)

export default function<
  Config extends ConfigDefault, 
>(
  authorOptions: AuthorOptions<Config>
  ){
  let _entrypoint = authorOptions?.entrypoint

  // Loop over reversed stack traces to the first path that is not a Vite `file://` path
  if (!_entrypoint) {
    for (const callsite of callsites().reverse()) {
      const file = (callsite as NodeJS.CallSite).getScriptNameOrSourceURL()
      if (file && isAbsoluteFile(file) && file !== thisFile) {
        _entrypoint = file
        break
      } 
    }
  }

  const entrypoint = validateFile(_entrypoint)

  const cwd = validateDirectory(entrypoint)

  const pkg = JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf-8"))


  // Theme name

  // Assign name from package.json as theme name
  authorOptions.name = pkg.name

  // If no name exists throw an error
  if (!authorOptions.name) {
    throw new AstroError(`Could not find name for theme! Add a name in your 'package.json' or to your author config`)
  }

  // Validate that the theme name is a valid package name or else throw an error
  const isValidName = validatePackageName(authorOptions.name)

  if (!isValidName.validForNewPackages) {
    throw new AstroError(
      `Theme name is not a valid package name! Add a name in your 'package.json' or to your author config`, 
      [...isValidName.errors, ...isValidName.warnings].join(', ')
    )
  }

  return defineIntegration({
    name: authorOptions.name,
    options: defineOptions<UserOptions<Config>>({} as Required<UserOptions<Config>>),
    plugins: [
      watchIntegrationPlugin,
      addVirtualImportPlugin,
      addDtsBufferPlugin,
      addPageDirPlugin,
    ], 
    setup({ options }) {
      const parsed = authorOptions.schema.safeParse(options.config, { errorMap });
      
      if (!parsed.success) {
        throw new AstroError(
          `Invalid configuration passed to '${authorOptions.name}' integration\n`,
            parsed.error.issues.map((i) => i.message).join('\n')
        );
      }
    
      const userConfig = parsed.data;

      return {
        'astro:config:setup': ({
          logger,
          config,
          watchIntegration,
          addPageDir,
          addVirtualImport,
          createDtsBuffer
        }) => {

          const srcDir = validateDirectory(config.srcDir.toString())

          const {
            addLinesToDts,
            addLinesToDtsInterface,
            addLinesToDtsModule,
            writeDtsBuffer
          } = createDtsBuffer(authorOptions.name!)

          const resolveAuthorImport = (id: string) => 
            JSON.stringify(id.startsWith('.') ? resolve(cwd, id) : id);
          
          const resolveUserImport = (id: string) => 
            JSON.stringify(id.startsWith('.') ? resolve(srcDir, id) : id)
              .replace(/^\"|\"$/g, '') // Added back by resolveAuthorImport

          const exportEntriesToTypes = ([name, path]: [string, string]) => {
            if (isCSSFile(path)) return ``
            if (isImageFile(path)) return `${camelCase(name)}: import('astro').ImageMetadata;`
            return `${camelCase(name)}: typeof import(${resolveAuthorImport(path)}).default;`
          }

          // HMR for `astro-theme-provider` package
          watchIntegration(dirname(fileURLToPath(import.meta.url)));

          // HMR for theme author's package
          watchIntegration(cwd);

          // Create virtual module for config (`my-theme/config`)
          addVirtualImport({
            name: authorOptions.name + '/config',
            content: `export default ${JSON.stringify(userConfig)}`,
          })

          // Generate types for virtual module (`my-theme/config`)
          addLinesToDtsModule(
            authorOptions.name + '/config',
            [ 
              `const config: ThemeConfig`,
              `export default config`
            ],
          )



          // Generate Modules

          // Utility types
          addLinesToDts(`
            type Prettify<T> = { [K in keyof T]: T[K]; } & {};

            type ThemeName = '${authorOptions.name}';
            type ThemeConfig = NonNullable<Parameters<typeof import("${entrypoint}").default>[0]>['config']

            declare type AstroThemes = keyof AstroThemeConfigs;
            declare type AstroThemeConfigs = {
              '${authorOptions.name}': ThemeConfig
            }

            declare type AstroThemeModulesGet<Name extends keyof AstroThemeModulesAuthored> = AstroThemeModulesAuthored[Name]

            declare type AstroThemeModulesOptions<Name extends keyof AstroThemeModulesAuthored> = {
              [Module in keyof AstroThemeModulesGet<Name>]?:
                AstroThemeModulesGet<Name>[Module] extends Record<string, any>
                  ? AstroThemeModulesGet<Name>[Module] extends string[]
                    ?	AstroThemeModulesGet<Name>[Module]
                    : { [Export in keyof AstroThemeModulesGet<Name>[Module]]?: string }
                  : never
            } & {}
            
            declare type AstroThemePagesOptions<Name extends keyof AstroThemePagesAuthored> = Prettify<Partial<Record<keyof AstroThemePagesAuthored[Name], string | boolean>>>`
          )


          // Buffers for modules types defined in AstroThemeModules interfaces, added to main addDts buffer after all virtual modules have been created
          const modulesAuthoredBuffer = new LineBuffer(undefined, -1)
          const modulesOverridesBuffer = new LineBuffer(undefined, -1)
          const modulesExportsBuffer = new LineBuffer(undefined, -1)


          function arrayToVirtualModule(moduleName: string, array: string[]) {
            if (array.length < 1) return // Skip empty arrays

            modulesAuthoredBuffer.add([`${moduleName}: string[]`])

            const overrides = options?.overrides?.[moduleName as keyof AstroThemeModulesOptions<ThemeName>]

            // Append user's "overrides" to array module
            if (overrides && Array.isArray(overrides)) {
              modulesOverridesBuffer.add([`${moduleName}: string[]`])
              array = [...array, ...overrides.map(path => resolveUserImport(path))]
            }

            // Add "import only" virtual module from array of entrypoints (mostly used for CSS)
            addVirtualImport({
              name: authorOptions.name + '/' + moduleName,
              content: array.map((path) => `import ${resolveAuthorImport(path)};`).join(''),
            })

            modulesExportsBuffer.add([`${moduleName}: string[]`])

            addLinesToDtsModule(authorOptions.name + '/' + moduleName, "")
          }

          
          function objToVirtualModule(moduleName: string, obj: Record<string, string>) {
            // Generate types for exports
            let exportedTypes = Object.entries(obj).map(exportEntriesToTypes)

            if (exportedTypes.length < 1) return // Skip empty objects

            // Add exportedTypes to buffer for AstroThemeModulesAuthored interface
            modulesAuthoredBuffer.add(wrapWithBrackets(exportedTypes, `${moduleName}: `))

            // Override exports with user's overrides
            const overrides = Object.entries(
              options?.overrides?.[moduleName as keyof AstroThemeModulesOptions<ThemeName>] || {} as Record<string, string>
            )

            if (overrides.length > 0) {
              // Create User module for overrding component inside author module, does not include user overrides ex:"my-theme:components" to prevent circular imports
              addVirtualImport({
                name: authorOptions.name + ':' + moduleName,
                content: Object.entries(obj)
                .map(([name, path]) => `export { default as ${camelCase(name)} } from ${resolveAuthorImport(path)};`)
                .join(''),
              })
              // Add types for virtual module
              addLinesToDtsModule(
                authorOptions.name + ':' + moduleName,
                exportedTypes.map(line => `export const ` + line)
              )

              // Resolve relative paths from user
              for (const [name, path] of overrides) {
                obj[camelCase(name)] = resolveUserImport(path)
              }

              // Add overrides to buffer for AstroThemeModulesOverrides interface
              modulesOverridesBuffer.add(
                wrapWithBrackets(
                  overrides.map(exportEntriesToTypes), 
                  `${moduleName}: `
                ),
              )
            }

            // Recalculate exportedTypes to include overrides
            exportedTypes = Object.entries(obj).map(exportEntriesToTypes)

            // Create main author module with user's overrides
            addVirtualImport({
              name: authorOptions.name + '/' + moduleName,
              content: Object.entries(obj)
              .map(([name, path]) => `export { default as ${camelCase(name)} } from ${resolveAuthorImport(path)};`)
              .join(''),
            })            
            // Add export types for virtual module
            addLinesToDtsModule(
              authorOptions.name + '/' + moduleName,
              exportedTypes.map(line => `export const ` + line)
            )

            // Add exportedTypes with overrides to buffer for AstroThemeModulesInjected interface
            modulesExportsBuffer.add(wrapWithBrackets(exportedTypes, `${moduleName}: `))
          }

          // Default modules
          const defaultModules: ExportTypes = {
            css: GLOB_CSS,
            assets: GLOB_IMAGES,
            layouts: GLOB_ASTRO,
            components: GLOB_ASTRO
          }
          
          Object.assign(defaultModules, authorOptions.modules)
          
          // Dynamically create virtual modules using globs and/or export objects defined by theme author or user
          for (let [moduleName, option] of Object.entries(defaultModules)) {
            if (!option) continue

            if (moduleName === "config") {
              logger.warn(`Export name 'config' is reserved for the config module '${authorOptions.name}/config'`)
              continue
            }

            moduleName = camelCase(moduleName)
            
            if (typeof option === "string") {
              option = globToModule(option, moduleName, cwd)
            }

            if (typeof option === "object") {
              if (Array.isArray(option)) {
                if (option.length > 0) {
                  arrayToVirtualModule(moduleName, option)
                }
                continue
              }
              objToVirtualModule(moduleName, option)
            }
          }

          // Add module interface buffers to main buffer

          addLinesToDtsInterface(
            `AstroThemeModulesAuthored`,
            wrapWithBrackets(
              modulesAuthoredBuffer.lines, 
              `'${authorOptions.name}': `
            ),
          )

          addLinesToDtsInterface(
            `AstroThemeModulesOverrides`,
            wrapWithBrackets(
              modulesOverridesBuffer.lines, 
              `'${authorOptions.name}': `
            ),
          )

          addLinesToDtsInterface(
            `AstroThemeModulesInjected`,
            wrapWithBrackets(
              modulesExportsBuffer.lines, 
              `'${authorOptions.name}': `
            ),
          )



          // Page injection

          // Handle 'authorOptions.pages' default
          if (!authorOptions.pages || typeof authorOptions.pages === "string") {
            authorOptions.pages = {
              dir: authorOptions.pages || "pages"
            }
          }

          // Overwrite/force cwd for finding routes
          Object.assign(authorOptions.pages, { cwd, log: "minimal" })

          // Initialize route injection
          const { patterns, injectPages } = addPageDir(authorOptions.pages)
          
          options.pages ??= {} as NonNullable<typeof options.pages>

          // Generate types for possibly injected routes
          addLinesToDtsInterface(
            'AstroThemePagesAuthored',
            wrapWithBrackets(
              Object.entries(patterns).map(([pattern, entrypoint]) => `'${pattern}': typeof import("${entrypoint}").default;`),
              `'${authorOptions.name}': `
            )
          )

          // Buffer for AstroThemePagesOverrides interface
          const pageOverrideBuffer = new LineBuffer()

          // Filter out routes the theme user toggled off
          for (let oldPattern of Object.keys(options.pages)) {
            // Skip route patterns that are not defined by author
            if (!patterns?.[oldPattern!]) continue

            const newPattern = options.pages[oldPattern as keyof typeof options.pages]

            // If user passes falsy value remove the route
            if (!newPattern) {
              delete patterns[oldPattern]
              continue
            }
            
            // If user defines a string, override route pattern
            if (typeof newPattern === "string") {
              if (!newPattern.startsWith('/')) {
                throw new AstroError(`Invalid page override, pattern must start with a forward slash '/'`, `New: ${newPattern}\nOld: ${oldPattern}`)
              }
              if (!validatePattern(newPattern, oldPattern)) {
                throw new AstroError(`Invalid page override, pattern must contain the same params in the same location`, `New: ${newPattern}\nOld: ${oldPattern}`)
              }
              // Add new pattern
              patterns[newPattern] = patterns[oldPattern]!
              // Add page type to buffer
              pageOverrideBuffer.add(`'${oldPattern}': '${newPattern}';`)
              // Remove old pattern
              delete patterns[oldPattern]
              continue
            }
          }

          //  Generate types for author pages overriden by a user
          if (pageOverrideBuffer.lines.length > 0) {
            addLinesToDtsInterface(
              'AstroThemePagesOverrides',
              wrapWithBrackets(
                pageOverrideBuffer.lines,
                `'${authorOptions.name}': `
              )
            )
          }

          // Generate types for injected routes
          addLinesToDtsInterface(
            'AstroThemePagesInjected',
            wrapWithBrackets(
              Object.entries(patterns).map(([pattern, entrypoint]) => `'${pattern}': typeof import("${entrypoint}").default;`),
              `'${authorOptions.name}': `
            )
          )

          // Inject routes/pages
          injectPages()



          // Write generated types to .d.ts file
          writeDtsBuffer()
        }
      }
    }
  })
}
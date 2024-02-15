
import { type Option as PageDirOption } from 'astro-pages/types';
import { AstroError } from "astro/errors";
import { z } from 'astro/zod';
import { readFileSync } from "node:fs";
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url'
import { defineIntegration, defineOptions } from "astro-integration-kit";
import { watchIntegrationPlugin, addVirtualImportPlugin, hasIntegrationPlugin } from "astro-integration-kit/plugins";
import addPageDirPlugin from 'astro-pages/plugins/astro-integration-kit.ts';
import validatePackageName from 'validate-npm-package-name';
import addDtsBufferPlugin from './plugins/d-ts-buffer'
import { errorMap } from './error-map';
import { GLOB_ASTRO, GLOB_CSS, GLOB_IMAGES, LineBuffer, camelCase, globToModule, isAbsoluteFile, isCSSFile, isImageFile, validateDirectory, validateFile, wrapWithBrackets } from './utils'
import callsites from 'callsites';

type Prettify<T> = { [K in keyof T]: T[K]; } & {};

type ConfigDefault = Record<string, unknown>

type ExportTypes = Record<string, undefined | null | false | string | string[] | Record<string, string>>

type AuthorOptions<
  Name extends keyof AstroThemePagesAuthored,
  Config extends ConfigDefault
> = Prettify<{
  entrypoint?: string;
  name?: Name;
  pages?: string | PageDirOption | undefined;
  schema: z.ZodSchema<Config>;
  modules?: ExportTypes | undefined
}>

type UserOptions<
  Name extends keyof AstroThemePagesAuthored,
  Config extends ConfigDefault, 
> = Prettify<{
  config: Config;
  pages?: AstroThemePageOptions<Name> | undefined
  overrides?: AstroThemeModulesOverrideOptions<Name> | undefined;
}>

export default function<
  Name extends keyof AstroThemePagesAuthored,
  Config extends ConfigDefault, 
>(
  authorOptions: AuthorOptions<Name, Config>
  ){
  let _entrypoint = authorOptions?.entrypoint

  // Loop over reversed stack traces to the first path that is not a Vite `file://` path
  if (!_entrypoint) {
    for (const callsite of callsites().reverse()) {
      const file = (callsite as NodeJS.CallSite).getScriptNameOrSourceURL()
      if (file && isAbsoluteFile(file)) {
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
    options: defineOptions<UserOptions<Name, Config>>({} as Required<UserOptions<Name, Config>>),
    plugins: [
      hasIntegrationPlugin,
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
          hasIntegration,
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
              .replace(/^\"|\"$/g, '')

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


          // Utility types for modules 
          addLinesToDts(`
            type Prettify<T> = { [K in keyof T]: T[K]; } & {};

            type ThemeConfig = NonNullable<Parameters<typeof import("${entrypoint}").default>[0]>['config']

            declare type AstroThemeConfigs = {
              '${authorOptions.name}': ThemeConfig
            }
            declare type AstroThemeModulesGet<Name extends keyof AstroThemeModulesAuthored> = AstroThemeModulesAuthored[Name]
            declare type AstroThemeModulesOverrideOptions<Name extends keyof AstroThemeModulesAuthored> = {
              [Module in keyof AstroThemeModulesGet<Name>]?:
                AstroThemeModulesGet<Name>[Module] extends Record<string, any>
                  ? AstroThemeModulesGet<Name>[Module] extends string[]
                    ?	AstroThemeModulesGet<Name>[Module]
                    : { [Export in keyof AstroThemeModulesGet<Name>[Module]]?: string }
                  : never
            } & {}
            
            declare type AstroThemePageOptions<Name extends keyof AstroThemePagesAuthored> = Prettify<Partial<Record<keyof AstroThemePagesAuthored[Name], string | boolean>>>
          `)


          // Buffer for module types defined in AstroThemeModules interface, added to main addDts buffer after all virtual modules have been created
          const modulesAuthoredBuffer = new LineBuffer()
          const modulesOverridesBuffer = new LineBuffer()
          const modulesExportsBuffer = new LineBuffer()

          const exportEntriesToTypes = ([name, path]: [string, string]) => {
            if (isCSSFile(path)) return ``
            if (isImageFile(path)) return `${camelCase(name)}: import('astro').ImageMetadata;`
            return `${camelCase(name)}: typeof import(${resolveAuthorImport(path)}).default;`
          }

          function arrayToVirtualModule(exportName: string, array: string[]) {
            if (array.length < 1) return // Skip empty arrays

            modulesAuthoredBuffer.add([`${exportName}: string[]`])

            const overrides = options?.overrides?.[exportName as keyof AstroThemeModulesOverrideOptions<Name>]

            // Append user's "overrides" to array module
            if (overrides && Array.isArray(overrides)) {
              modulesOverridesBuffer.add([`${exportName}: string[]`])
              array = [...array, ...overrides.map(path => resolveUserImport(path))]
            }

            // Add "import only" virtual module from array of entrypoints (mostly used for CSS)
            addVirtualImport({
              name: authorOptions.name + '/' + exportName,
              content: array.map((path) => `import ${resolveAuthorImport(path)};`).join(''),
            })

            modulesExportsBuffer.add([`${exportName}: string[]`])

            addLinesToDtsModule(authorOptions.name + '/' + exportName, "")
          }

          function objToVirtualModule(exportName: string, obj: Record<string, string>) {
            // Generate types for exports
            let exportedTypes = Object.entries(obj).map(exportEntriesToTypes)

            if (exportedTypes.length < 1) return // Skip empty objects

            // Add exportedTypes to buffer for AstroThemeModulesAuthored interface
            modulesAuthoredBuffer.add(wrapWithBrackets(exportedTypes, `${exportName}: `))

            // Override exports with user's overrides
            const overrides = Object.entries(
              options?.overrides?.[exportName as keyof AstroThemeModulesOverrideOptions<Name>] || {} as Record<string, string>
            )

            if (overrides.length > 0) {
              // Create User module for overrding component inside author module, does not include user overrides ex:"my-theme:components" to prevent circular imports
              addVirtualImport({
                name: authorOptions.name + ':' + exportName,
                content: Object.entries(obj)
                .map(([name, path]) => `export { default as ${camelCase(name)} } from ${resolveAuthorImport(path)};`)
                .join(''),
              })
              // Add types for virtual module
              addLinesToDtsModule(
                authorOptions.name + ':' + exportName,
                exportedTypes.map(line => `export const ` + line)
              )

              console.log(obj)
              // Resolve relative paths from user relative to srcDir
              for (const [name, path] of overrides) {
                console.log(path, '\n', resolveUserImport(path))
                obj[name] = resolveUserImport(path)
              }
              console.log(obj)

              // Add overrides to buffer for AstroThemeModulesOverrides interface
              modulesOverridesBuffer.add(
                wrapWithBrackets(
                  overrides.map(exportEntriesToTypes), 
                  `${exportName}: `
                )
              )
            }

            // Recalculate exportedTypes to include overrides
            exportedTypes = Object.entries(obj).map(exportEntriesToTypes)

            // Create main author module with user's overrides
            addVirtualImport({
              name: authorOptions.name + '/' + exportName,
              content: Object.entries(obj)
              .map(([name, path]) => `export { default as ${camelCase(name)} } from ${resolveAuthorImport(path)};`)
              .join(''),
            })            
            // Add export types for virtual module
            addLinesToDtsModule(
              authorOptions.name + '/' + exportName,
              exportedTypes.map(line => `export const ` + line)
            )

            // Add exportedTypes with overrides to buffer for AstroThemeModulesExports interface
            modulesExportsBuffer.add(wrapWithBrackets(exportedTypes, `${exportName}: `))
          }

          // Default modules
          const modules: ExportTypes = {
            css: GLOB_CSS,
            assets: GLOB_IMAGES,
            layouts: GLOB_ASTRO,
            components: GLOB_ASTRO
          }
          
          Object.assign(modules, authorOptions.modules)
          
          // Dynamically create virtual modules using globs and/or export objects defined by theme author or user
          for (let [exportName, option] of Object.entries(modules)) {
            if (!option) continue

            if (typeof option === "string") {
              if (exportName === "config") {
                logger.warn(`Export name 'config' is reserved for the config module '${authorOptions.name}/config'`)
                continue
              }
              option = globToModule(option, exportName, cwd)
            }

            if (typeof option === "object") {
              if (Array.isArray(option)) {
                if (option.length > 0) {
                  arrayToVirtualModule(exportName, option)
                }
                continue
              }

              objToVirtualModule(exportName, option)
            }
          }

          // Add module interfaces to main buffer

          addLinesToDtsInterface(
            `AstroThemeModulesAuthored`,
            wrapWithBrackets(
              [...modulesAuthoredBuffer.lines], 
              `'${authorOptions.name}': `
            ),
          )

          addLinesToDtsInterface(
            `AstroThemeModulesOverrides`,
            wrapWithBrackets(
              [...modulesOverridesBuffer.lines], 
              `'${authorOptions.name}': `
            ),
          )

          addLinesToDtsInterface(
            `AstroThemeModulesExports`,
            wrapWithBrackets(
              [...modulesExportsBuffer.lines], 
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
              Object.entries(patterns).map(([pattern, entrypoint]) => `'${pattern}': '${entrypoint}';`),
              `'${authorOptions.name}': `
            )
          )

          // Buffer for AstroThemePagesOverrides interface
          const pageOverrideBuffer = new LineBuffer()

          // Filter out routes the theme user toggled off
          for (let pattern of Object.keys(options.pages)) {
            // Skip route patterns that are not defined by author
            if (!patterns?.[pattern!]) continue

            const newPattern = options.pages[pattern as keyof typeof options.pages]

            // If user passes falsy value remove the route
            if (!newPattern) {
              delete patterns[pattern]
              continue
            }
            
            // If user defines a string, override route pattern
            if (typeof newPattern === "string") {
              // TODO, validate that user's pattern contains the same params as author's pattern and starts with `/`
              patterns[newPattern] = patterns[pattern]!
              pageOverrideBuffer.add(`'${pattern}': '${newPattern}';`)
              delete patterns[pattern]
              continue
            }
          }

          //  Generate types for author pages overriden by a user
          addLinesToDtsInterface(
            'AstroThemePagesOverrides',
            wrapWithBrackets(
              pageOverrideBuffer.lines,
              `'${authorOptions.name}': `
            )
          )

          // Generate types for injected routes
          addLinesToDtsInterface(
            'AstroThemePagesInjected',
            wrapWithBrackets(
              Object.entries(patterns).map(([pattern, entrypoint]) => `'${pattern}': '${entrypoint}';`),
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
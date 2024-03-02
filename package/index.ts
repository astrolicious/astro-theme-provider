import { cpSync, createReadStream, existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import {
	addDts,
	addVirtualImport,
	watchIntegration,
} from "astro-integration-kit/utilities";
import { addPageDir } from "astro-pages";
import type { IntegrationOption as PageIntegrationOption } from "astro-pages/types";
import { AstroError } from "astro/errors";
import callsites from "callsites";
// @ts-ignore
import validatePackageName from "validate-npm-package-name";
import type {
	AuthorOptions,
	ConfigDefault,
	ModuleOptions,
	PackageJSON,
	PublicDirOption,
	UserOptions,
} from "./types";
import {
	GLOB_ASTRO,
	GLOB_COMPONENTS,
	GLOB_CSS,
	GLOB_IMAGES,
	LineBuffer,
	camelCase,
	createDtsBuffer,
	createResolver,
	errorMap,
	globToModule,
	isAbsoluteFile,
	isCSSFile,
	isImageFile,
	validatePattern,
	wrapWithBrackets,
} from "./utils";

const thisFile = fileURLToPath(import.meta.url);

export default function <Config extends ConfigDefault>(
	authorOptions: AuthorOptions<Config>,
) {
	if (!authorOptions.entrypoint) {
		// Loop over reversed stack traces
		// Get file path of trace
		// Assign first non Vite `file://` path as entrypoint (assume it is a theme's `index.ts`)
		for (const callsite of callsites().reverse()) {
			const file = (callsite as NodeJS.CallSite).getScriptNameOrSourceURL();
			if (file && isAbsoluteFile(file) && file !== thisFile) {
				authorOptions.entrypoint = file;
				break;
			}
		}
	}

	// Will be assigned value when 'astro:config:setup' hook runs
	let srcDir: string;
	let publicDir: string;
	let outDir: string;

	const {
		base: cwd,
		toAbsolute,
		toAbsoluteDir,
		toAbsoluteFileSafe,
	} = createResolver(authorOptions.entrypoint);

	// Theme's `index.ts`
	const entrypoint = toAbsoluteFileSafe(authorOptions.entrypoint);

	// Defaults for 'public' folder
	const publicOptions: PublicDirOption = {
		copy: "before",
	};

	// If public option is string, turn it into object
	if (!authorOptions.public || typeof authorOptions.public === "string") {
		authorOptions.public = {
			dir: authorOptions.public,
		};
	}

	// Override defaults with author options
	Object.assign(publicOptions, authorOptions.public);

	// Get public directory

	const staticDir = toAbsoluteDir(publicOptions.dir || "public");

	const staticDirExists = (staticDir && existsSync(staticDir)) || false;

	// Default virtual modules
	const moduleOptions: ModuleOptions = {
		css: GLOB_CSS,
		assets: GLOB_IMAGES,
		layouts: GLOB_ASTRO,
		components: GLOB_COMPONENTS,
	};

	// Override default module options with author options
	Object.assign(moduleOptions, authorOptions.modules);

	// Theme's `package.json`
	const pkgJSON: PackageJSON = {};

	try {
		// Safely read theme's `package.json` file, parse into Object, assign keys/values to `pkgJSON`
		Object.assign(
			pkgJSON,
			JSON.parse(readFileSync(toAbsoluteFileSafe("package.json"), "utf-8")),
		);
	} catch (error) {}

	// Assign name from `package.json` as theme name
	const themeName = pkgJSON.name || authorOptions.name;

	// If no name exists throw an error
	if (!themeName) {
		throw new AstroError(
			`Could not find name for theme! Add a name in your 'package.json' or to your author config`,
		);
	}

	// Validate that the theme name is a valid package name
	const isValidName = validatePackageName(themeName);

	if (!isValidName.validForNewPackages) {
		throw new AstroError(
			`Theme name is not a valid package name!`,
			[...isValidName.errors, ...isValidName.warnings].join(", "),
		);
	}

	return (options: UserOptions<Config>): AstroIntegration => {
		const parsed = authorOptions.schema.safeParse(options.config, { errorMap });

		if (!parsed.success) {
			throw new AstroError(
				`Invalid configuration passed to '${themeName}' integration\n`,
				parsed.error.issues.map((i) => i.message).join("\n"),
			);
		}

		const userConfig = parsed.data;

		return {
			name: themeName,
			hooks: {
				"astro:config:setup": ({
					command,
					config,
					logger,
					updateConfig,
					addWatchFile,
					injectRoute,
				}) => {
					srcDir = fileURLToPath(config.srcDir.toString());
					publicDir = fileURLToPath(config.publicDir.toString());
					outDir = fileURLToPath(config.outDir.toString());

					const {
						addLinesToDts,
						addLinesToDtsInterface,
						addLinesToDtsModule,
						compileDtsBuffer,
					} = createDtsBuffer();

					const resolveAuthorImport = (id: string, base = "./") =>
						JSON.stringify(
							id.startsWith(".") ? toAbsolute(join(base, id)) : id,
						);

					const resolveUserImport = (id: string) =>
						id.startsWith(".") ? resolve(srcDir, id) : id;

					const moduleEntriesToTypes =
						(moduleName: string) =>
						([name, path]: [string, string]) => {
							if (isCSSFile(path)) return ``;
							if (isImageFile(path))
								return `${camelCase(name)}: import("astro").ImageMetadata;`;
							return `${camelCase(name)}: typeof import(${resolveAuthorImport(
								path,
								moduleName,
							)}).default;`;
						};

					// If package is not private, warn theme author about issues with package
					if (!pkgJSON.private) {
						// Warn theme author if `astro-integration` keyword does not exist inside 'package.json'
						if (!pkgJSON?.keywords?.includes("astro-integration")) {
							logger.warn(
								`Add the 'astro-integration' keyword to your theme's 'package.json'!\tAstro uses this value to support the command 'astro add ${themeName}'\n\n\t"keywords": [ "astro-integration" ],\n`,
							);
						}

						// Warn theme author if no 'description' property exists inside 'package.json'
						if (!pkgJSON?.description) {
							logger.warn(
								`Add a 'description' to your theme's 'package.json'!\tAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"description": "My awesome Astro theme!",\n`,
							);
						}

						// Warn theme author if no 'homepage' property exists inside 'package.json'
						if (!pkgJSON?.homepage) {
							logger.warn(
								`Add a 'homepage' to your theme's 'package.json'!\tAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"homepage": "https://github.com/UserName/my-theme",\n`,
							);
						}

						// Warn theme author if no 'repository' property exists inside 'package.json'
						if (!pkgJSON?.repository) {
							logger.warn(
								`Add a 'repository' to your theme's 'package.json'!\tAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"repository": ${JSON.stringify(
									{
										type: "git",
										url: "https://github.com/UserName/my-theme",
										directory: "package",
									},
									null,
									4,
								).replace(/\n/g, "\n\t")},\n`,
							);
						}

						// Warn theme author if package does not have a README
						if (!existsSync(resolve(cwd, "README.md"))) {
							logger.warn(
								`Add a 'README.md' to the root of your theme's package!\tNPM uses this file to populate the package page https://www.npmjs.com/package/${themeName}\n`,
							);
						}
					}

					// HMR for `astro-theme-provider` package
					watchIntegration({
						dir: dirname(thisFile),
						command,
						updateConfig,
						addWatchFile,
					});

					// HMR for theme author's package
					watchIntegration({
						dir: cwd,
						command,
						updateConfig,
						addWatchFile,
					});

					// Create virtual module for config (`my-theme/config`)
					addVirtualImport({
						name: themeName + "/config",
						content: `export default ${JSON.stringify(userConfig)}`,
						updateConfig,
					});

					// Generate types for virtual module (`my-theme/config`)
					addLinesToDtsModule(themeName + "/config", [
						`const config: ThemeConfig`,
						`export default config`,
					]);

					// Generate Modules

					// Utility types
					addLinesToDts(`
            type Prettify<T> = { [K in keyof T]: T[K]; } & {};
  
            type ThemeName = "${themeName}";
            type ThemeConfig = NonNullable<Parameters<typeof import("${entrypoint}").default>[0]>["config"]
  
            declare type AstroThemes = keyof AstroThemeConfigs;

            declare type AstroThemeConfigs = {
              "${themeName}": ThemeConfig
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
            
            declare type AstroThemePagesOptions<Name extends keyof AstroThemePagesAuthored> = Prettify<Partial<Record<keyof AstroThemePagesAuthored[Name], string | boolean>>>`);

					// Buffers for modules types defined in AstroThemeModules interfaces, added to main addDts buffer after all virtual modules have been created
					const modulesAuthoredBuffer = new LineBuffer(undefined, -1);
					const modulesOverridesBuffer = new LineBuffer(undefined, -1);
					const modulesExportsBuffer = new LineBuffer(undefined, -1);

					function arrayToVirtualModule(moduleName: string, array: string[]) {
						if (array.length < 1) return; // Skip empty arrays

						modulesAuthoredBuffer.add([`${moduleName}: string[]`]);

						const overrides =
							options?.overrides?.[
								moduleName as keyof AstroThemeModulesOptions<ThemeName>
							];

						// Append user's "overrides" to array module
						if (overrides && Array.isArray(overrides)) {
							modulesOverridesBuffer.add([`${moduleName}: string[]`]);
							array = [
								...array,
								...overrides.map((path) => resolveUserImport(path)),
							];
						}

						// Add "import only" virtual module from array of entrypoints (mostly used for CSS)
						addVirtualImport({
							name: themeName + "/" + moduleName,
							content: array
								.map((path) => `import ${resolveAuthorImport(path)};`)
								.join(""),
							updateConfig,
						});

						modulesExportsBuffer.add([`${moduleName}: string[]`]);

						addLinesToDtsModule(themeName + "/" + moduleName, "");
					}

					function objToVirtualModule(
						moduleName: string,
						exports: Record<string, string>,
					) {
						// Generate types for exports
						let exportedTypes = Object.entries(exports).map(
							moduleEntriesToTypes(moduleName),
						);

						if (exportedTypes.length < 1) return; // Skip empty objects

						// Add exportedTypes to buffer for AstroThemeModulesAuthored interface
						modulesAuthoredBuffer.add(
							wrapWithBrackets(exportedTypes, `${moduleName}: `),
						);

						// Override exports with user's overrides
						const overrides =
							(options?.overrides?.[
								moduleName as keyof AstroThemeModulesOptions<ThemeName>
							] as Record<string, string>) || {};

						if (Object.keys(overrides).length > 0) {
							// Create User module for overrding component inside author module, does not include user overrides ex:"my-theme:components" to prevent circular imports
							addVirtualImport({
								name: themeName + ":" + moduleName,
								content: Object.entries(exports)
									.map(
										([name, path]) =>
											`export { default as ${camelCase(
												name,
											)} } from ${resolveAuthorImport(path, moduleName)};`,
									)
									.join(""),
								updateConfig,
							});
							// Add types for virtual module
							addLinesToDtsModule(
								themeName + ":" + moduleName,
								exportedTypes.map((line) => `export const ` + line),
							);

							// Resolve relative paths from user
							for (const name in overrides) {
								overrides[name] = resolveUserImport(overrides[name]!);
							}

							// Override
							Object.assign(exports, overrides);

							// Add overrides to buffer for AstroThemeModulesOverrides interface
							modulesOverridesBuffer.add(
								wrapWithBrackets(
									Object.entries(overrides).map(
										moduleEntriesToTypes(moduleName),
									),
									`${moduleName}: `,
								),
							);
						}

						// Recalculate exportedTypes to include overrides
						exportedTypes = Object.entries(exports).map(
							moduleEntriesToTypes(moduleName),
						);

						// Create main author module with user's overrides
						addVirtualImport({
							name: themeName + "/" + moduleName,
							content: Object.entries(exports)
								.map(
									([name, path]) =>
										`export { default as ${camelCase(
											name,
										)} } from ${resolveAuthorImport(path, moduleName)};`,
								)
								.join(""),
							updateConfig,
						});
						// Add export types for virtual module
						addLinesToDtsModule(
							themeName + "/" + moduleName,
							exportedTypes.map((line) => line && `export const ` + line),
						);

						// Add exportedTypes with overrides to buffer for AstroThemeModulesInjected interface
						modulesExportsBuffer.add(
							wrapWithBrackets(exportedTypes, `${moduleName}: `),
						);
					}

					// Dynamically create virtual modules using globs and/or export objects defined by theme author or user
					for (let [moduleName, option] of Object.entries(moduleOptions)) {
						if (!option) continue;

						if (moduleName === "config") {
							logger.warn(
								`Export name 'config' is reserved for the config module '${themeName}/config'`,
							);
							continue;
						}

						moduleName = camelCase(moduleName);

						if (typeof option === "string") {
							option = globToModule(option, moduleName, cwd);
						}

						if (typeof option === "object") {
							if (Array.isArray(option)) {
								if (option.length > 0) {
									arrayToVirtualModule(moduleName, option);
								}
								continue;
							}
							objToVirtualModule(moduleName, option);
						}
					}

					// Add module interface buffers to main buffer

					addLinesToDtsInterface(
						`AstroThemeModulesAuthored`,
						wrapWithBrackets(modulesAuthoredBuffer.lines, `"${themeName}": `),
					);

					addLinesToDtsInterface(
						`AstroThemeModulesOverrides`,
						wrapWithBrackets(modulesOverridesBuffer.lines, `"${themeName}": `),
					);

					addLinesToDtsInterface(
						`AstroThemeModulesInjected`,
						wrapWithBrackets(modulesExportsBuffer.lines, `"${themeName}": `),
					);

					// Page injection

					// Handle 'authorOptions.pages' default
					if (!authorOptions.pages || typeof authorOptions.pages === "string") {
						authorOptions.pages = {
							dir: authorOptions.pages || "pages",
						};
					}

					// Overwrite/force cwd for finding routes
					Object.assign(authorOptions.pages, { cwd, config, logger });

					// Initialize route injection
					const { pages, injectPages } = addPageDir(authorOptions.pages as PageIntegrationOption);

					options.pages ??= {} as NonNullable<typeof options.pages>;

					// Generate types for possibly injected routes
					addLinesToDtsInterface(
						"AstroThemePagesAuthored",
						wrapWithBrackets(
							Object.entries(pages).map(
								([pattern, entrypoint]) =>
									`"${pattern}": typeof import("${entrypoint}").default;`,
							),
							`"${themeName}": `,
						),
					);

					// Buffer for AstroThemePagesOverrides interface
					const pageOverrideBuffer = new LineBuffer();

					// Filter out routes the theme user toggled off
					for (const oldPattern of Object.keys(options.pages)) {
						// Skip pages that are not defined by author
						if (!pages?.[oldPattern!]) continue;

						const newPattern =
							options.pages[oldPattern as keyof typeof options.pages];

						// If user passes falsy value remove the route
						if (!newPattern) {
							delete pages[oldPattern];
							continue;
						}

						// If user defines a string, override route pattern
						if (typeof newPattern === "string") {
							if (!newPattern.startsWith("/")) {
								throw new AstroError(
									`Invalid page override, pattern must start with a forward slash '/'`,
									`New: ${newPattern}\nOld: ${oldPattern}`,
								);
							}
							if (!validatePattern(newPattern, oldPattern)) {
								throw new AstroError(
									`Invalid page override, pattern must contain the same params in the same location`,
									`New: ${newPattern}\nOld: ${oldPattern}`,
								);
							}
							// Add new pattern
							pages[newPattern] = pages[oldPattern]!;
							// Add page type to buffer
							pageOverrideBuffer.add(`"${oldPattern}": "${newPattern}";`);
							// Remove old pattern
							delete pages[oldPattern];
							continue;
						}
					}

					//  Generate types for author pages overriden by a user
					if (pageOverrideBuffer.lines.length > 0) {
						addLinesToDtsInterface(
							"AstroThemePagesOverrides",
							wrapWithBrackets(pageOverrideBuffer.lines, `"${themeName}": `),
						);
					}

					// Generate types for injected routes
					addLinesToDtsInterface(
						"AstroThemePagesInjected",
						wrapWithBrackets(
							Object.entries(pages).map(
								([pattern, entrypoint]) =>
									`"${pattern}": typeof import("${entrypoint}").default;`,
							),
							`"${themeName}": `,
						),
					);

					// Inject routes/pages
					injectPages(injectRoute);

					// Write generated types to .d.ts file
					addDts({
						name: themeName,
						content: compileDtsBuffer(),
						root: config.root,
						srcDir: config.srcDir,
						logger,
					});
				},
				"astro:server:setup": ({ logger, server }) => {
					if (!staticDirExists) return;
					// Handle static assets in public during dev
					server.middlewares.use("/", (req, res, next) => {
						// Trim query params from path
						const path = req.url?.replace(/\?.*$/, "");
						// Check if url is a file/asset path
						if (path && extname(path) && !path.startsWith("/@")) {
							// Create path relative to custom public dir
							const asset = resolve(staticDir!, `.${path!}`);
							if (existsSync(asset)) {
								// Skip asset if it will be overwrriten by asset in real public dir
								if (
									publicOptions.copy === "before" &&
									existsSync(resolve(publicDir, `.${path!}`))
								) {
									next();
								}

								// Return asset from theme's public folder
								try {
									createReadStream(asset).pipe(res);
								} catch {
									logger.warn(
										`Failed to serve theme asset:\t${path}\t${asset}`,
									);
									next();
								}
							} else next();
						} else next();
					});
				},
				"astro:build:setup": ({ logger }) => {
					if (publicOptions.copy !== "before" || !staticDirExists) return;
					try {
						// Copy theme's public dir into build output, assets will be overwritten by assets in theme users public dir
						cpSync(staticDir!, outDir, { recursive: true });
					} catch {
						logger.warn("Failed to copy public dir into output: " + staticDir);
					}
				},
				"astro:build:done": ({ logger }) => {
					if (publicOptions.copy !== "after" || !staticDirExists) return;
					try {
						// Copy custom public dir into build output, assets will overwrite assets in theme users public dir
						cpSync(staticDir!, outDir, { recursive: true });
					} catch {
						logger.warn("Failed to copy public dir into output: " + staticDir);
					}
				},
			},
		};
	};
}

export {
	GLOB_CSS,
	GLOB_API,
	GLOB_DATA,
	GLOB_ASTRO,
	GLOB_IMAGES,
	GLOB_MARKDOWN,
	GLOB_UI_FRAMEWORK,
	GLOB_COMPONENTS,
	GLOB_PAGES,
} from "./utils";

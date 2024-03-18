import { join, resolve } from "node:path";
import type { AstroIntegration } from "astro";
import { addDts, addIntegration, addVirtualImports, watchIntegration } from "astro-integration-kit/utilities";
import { addPageDir } from "astro-pages";
import type { IntegrationOption as PageDirIntegrationOption, Option as PageDirOption } from "astro-pages/types";
import staticDir from "astro-public";
import type { Option as PublicDirOption } from "astro-public/types";
import { AstroError } from "astro/errors";
import { z } from "astro/zod";
import callsites from "callsites";
// @ts-ignore
import validatePackageName from "validate-npm-package-name";
import type { AuthorOptions, UserOptions } from "./types";
import { GLOB_ASTRO, GLOB_COMPONENTS, GLOB_CSS, GLOB_IMAGES } from "./utils/consts.ts";
import { errorMap } from "./utils/error-map.ts";
import { PackageJSON, warnThemePackage } from "./utils/package.ts";
import { addLeadingSlash, normalizePath, removeTrailingSlash, stringToDirectory, stringToFilepath, validatePattern } from "./utils/path.ts";
import { convertToModuleObject, getModuleObjectTypes, globToModuleObject, mergeVirtualModule, resolveModuleObject, virtualModuleObject } from "./utils/virtual.ts";
import { mergeOptions } from "./utils/options.ts";

const thisFile = stringToFilepath("./", import.meta.url);
const thisRoot = stringToDirectory("./", thisFile);

export default function <Schema extends z.ZodTypeAny>(partialAuthorOptions: AuthorOptions<Schema>) {
	// Theme package entrypoint (/package/index.ts)
	const themeEntrypoint = callsites()
		.reverse()
		.map((callsite) => (callsite as NodeJS.CallSite).getScriptNameOrSourceURL())
		// Assume the first path before `file://` path is the entrypoint
		.find((path) => path && !path.startsWith("file://") && path !== thisFile)!;

	// Theme package root (/package)
	const themeRoot = stringToDirectory("./", themeEntrypoint);

	// Default options
	const authorOptions = {
		name: "my-theme",
		entrypoint: themeEntrypoint,
		srcDir: "src",
		pageDir: "pages",
		publicDir: "public",
		schema: z.record(z.any()),
		modules: {
			css: GLOB_CSS,
			assets: GLOB_IMAGES,
			layouts: GLOB_ASTRO,
			components: GLOB_COMPONENTS,
		},
	} as Required<AuthorOptions<z.ZodRecord>>;

	if (typeof authorOptions.pageDir === "string") {
		authorOptions.pageDir = { dir: authorOptions.pageDir } as PageDirOption;
	}

	if (typeof authorOptions.publicDir === "string") {
		authorOptions.publicDir = { dir: authorOptions.publicDir } as PublicDirOption;
	}

	// Merge author options with default options
	mergeOptions(authorOptions, partialAuthorOptions);

	// Theme source dir (/package/src)
	const themeSrc = stringToDirectory(themeRoot, authorOptions.srcDir);
	
	// Force options
	mergeOptions(authorOptions, {
		pageDir: { cwd: themeSrc },
		publicDir: { cwd: themeSrc },
	});

	// Theme `package.json`
	const themePackage = new PackageJSON(themeRoot);

	// Assign theme name
	const themeName = themePackage.json.name || authorOptions.name;

	// Validate that the theme name is a valid package name
	const isValidName = validatePackageName(themeName);

	if (!isValidName.validForNewPackages) {
		throw new AstroError(
			`Theme name is not a valid package name!`,
			[...isValidName.errors, ...isValidName.warnings].join(", "),
		);
	}

	return (userOptions: UserOptions<Schema>): AstroIntegration => {
		const parsed = authorOptions.schema.safeParse(userOptions.config, { errorMap });

		if (!parsed.success) {
			throw new AstroError(
				`Invalid configuration passed to '${themeName}' integration\n`,
				parsed.error.issues.map((i) => i.message).join("\n"),
			);
		}

		const userConfig = parsed.data;

		userOptions.config = userConfig

		return {
			name: themeName,
			hooks: {
				"astro:db:setup": ({ extendDb }) => {
					const configEntrypoint = resolve(cwd, "db/cofig.ts");
					const seedEntrypoint = resolve(cwd, "db/seed.ts");
					if (existsSync(configEntrypoint)) extendDb({ configEntrypoint });
					if (existsSync(seedEntrypoint)) extendDb({ seedEntrypoint });
				},
				"astro:config:setup": ({ command, config, logger, updateConfig, addWatchFile, injectRoute }) => {
					const virtualImports: Record<string, string> = {
						[`${themeName}/config`]: `export default ${JSON.stringify(userConfig)}`,
					};

					const moduleBuffers: Record<string, string> = {
						[`${themeName}/config`]: "\nconst config: ThemeConfig;\nexport default config;",
					};

					const interfaceBuffers = {
						AstroThemeImports: "",
						AstroThemeImportOverrides: "",
						AstroThemeImportsResolved: "",
						AstroThemePagesAuthored: "",
						AstroThemePagesOverrides: "",
					};

					let themeTypesBuffer = `
						type Prettify<T> = { [K in keyof T]: T[K]; } & {};

						type ThemeName = "${themeName}";
						type ThemeConfig = NonNullable<Parameters<typeof import("${themeEntrypoint}").default>[0]>["config"]

						declare type AstroThemes = keyof AstroThemeConfigs;

						declare type AstroThemeConfigs = {
							"${themeName}": ThemeConfig
						}

						declare type GetAstroThemeImports<Name extends keyof AstroThemeConfigs> = AstroThemeImports[Name]

						declare type AstroThemeImportOverrideOptions<Name extends keyof AstroThemeConfigs, Imports = GetAstroThemeImports<Name>> = {
							[Module in keyof Imports]?:
								Imports[Module] extends Record<string, any>
									? Imports[Module] extends string[]
										?	Imports[Module]
										: { [Export in keyof Imports[Module]]?: string }
									: never
						} & {}
						
						declare type AstroThemePagesOverridesOptions<Name extends keyof AstroThemePagesAuthored> = Prettify<Partial<Record<keyof AstroThemePagesAuthored[Name], string | boolean>>>

						declare type AstroThemePagesInjected = AstroThemePagesOverrides & AstroThemePagesAuthored
					`;

					// Warn about issues with theme's `package.json`
					warnThemePackage(themePackage, logger);

					//HMR for `astro-theme-provider` package
					watchIntegration({
						dir: thisRoot,
						command,
						updateConfig,
						addWatchFile,
					});

					// HMR for theme author's package
					watchIntegration({
						dir: themeRoot,
						command,
						updateConfig,
						addWatchFile,
					});

					addIntegration({
						integration: staticDir(authorOptions.publicDir!),
						config,
						logger,
						updateConfig,
					});

					/*

					
							Virtual Imports/Modules/Overrides


					*/

					// Dynamically create virtual modules using globs, imports, or exports
					for (let [name, option] of Object.entries(authorOptions.modules)) {
						if (!option) continue;

						if (["config", "pages", "public", "content", "db"].includes(name)) {
							logger.warn(`Export name '${name}' is reserved for the built in virtual import '${themeName}/${name}'`);
							continue;
						}

						const moduleName = normalizePath(join(themeName, name));
						const moduleRoot = normalizePath(resolve(themeSrc, name));

						if (typeof option === "string") {
							option = globToModuleObject(moduleRoot, option)
						}

						let virtualModule = virtualModuleObject(moduleName, convertToModuleObject(option));

						let typesObjectContent = getModuleObjectTypes(virtualModule, ({ name, type }) => `\n${name}: ${type}`);
						let typesModuleContent = getModuleObjectTypes(
							virtualModule,
							({ name, type }) => `\nexport const ${name}: ${type}`,
						);

						interfaceBuffers["AstroThemeImports"] += `
							"${name}": ${
								typesObjectContent
								? `{\n${typesObjectContent}\n}`
								: 'string[]'
							},
						`

						const override = userOptions.overrides?.[name as keyof GetAstroThemeImports<ThemeName>]

						if (override) {
							const altModuleName = moduleName.replace(/\//, ":");
							const moduleOverride = resolveModuleObject(convertToModuleObject(override))
							const moduleOverrideTypes = getModuleObjectTypes(moduleOverride, ({ name, type }) => `\n${name}: ${type}`);
							
							if (moduleOverrideTypes) {
								virtualImports[altModuleName] = virtualModule.content;
	
								moduleBuffers[altModuleName] = typesModuleContent;
	
								if (moduleOverrideTypes) {
									interfaceBuffers["AstroThemeImportOverrides"] += `
										"${name}": {
											${moduleOverrideTypes}
										},
									`;
								}
	
								virtualModule = mergeVirtualModule(virtualModule, moduleOverride);
							}
						}

						// Re-generate virtual module types to include user overrides
						typesObjectContent = getModuleObjectTypes(virtualModule, ({ name, type }) => `\n${name}: ${type}`)
						typesModuleContent = getModuleObjectTypes(
							virtualModule,
							({ name, type }) => `\nexport const ${name}: ${type}`,
						);

						// Add virtual import
						virtualImports[moduleName] = virtualModule.content;

						// Generate types for virtual import
						moduleBuffers[moduleName] = typesModuleContent;

						
						interfaceBuffers["AstroThemeImportsResolved"] += `
							"${name}": ${
								typesObjectContent
								? `{\n${typesObjectContent}\n}`
								: 'string[]'
							},
						`
					}

					/*
					

							Pages/Routing


					*/

					const pageDirOption = {
						...(authorOptions.pageDir as PageDirOption),
						config,
						logger,
					} as PageDirIntegrationOption;

					// Initialize route injection
					const { pages, injectPages } = addPageDir(pageDirOption);

					userOptions.pages ||= {} as NonNullable<typeof userOptions.pages>;

					// Generate types for possibly injected routes
					interfaceBuffers["AstroThemePagesAuthored"] += Object.entries(pages).map(
						([pattern, entrypoint]) => `\n"${pattern}": typeof import("${entrypoint}").default`,
					).join('');

					// Buffer for AstroThemePagesOverrides interface
					let pageOverrideBuffer = "";

					// Filter out routes the theme user toggled off
					for (const oldPattern of Object.keys(userOptions.pages)) {
						// Skip pages that are not defined by author
						if (!pages?.[oldPattern!]) continue;

						let newPattern = userOptions.pages[oldPattern as keyof typeof userOptions.pages];

						// If user passes falsy value remove the route
						if (!newPattern) {
							delete pages[oldPattern];
							continue;
						}

						// If user defines a string, override route pattern
						if (typeof newPattern === "string") {
							newPattern = addLeadingSlash(removeTrailingSlash(newPattern));
							if (!validatePattern(newPattern, oldPattern)) {
								throw new AstroError(
									`Invalid page override, pattern must contain the same params in the same location`,
									`New: ${newPattern}\nOld: ${oldPattern}`,
								);
							}
							// Remove old pattern
							delete pages[oldPattern];
							// Add new pattern
							pages[newPattern] = pages[oldPattern]!;
							// Add types to buffer
							pageOverrideBuffer += `\n"${oldPattern}": "${newPattern}";`;
							continue;
						}
					}

					interfaceBuffers["AstroThemePagesOverrides"] += pageOverrideBuffer;

					// Inject routes/pages
					injectPages(injectRoute);

					// Add virtual modules
					addVirtualImports({
						name: themeName,
						config,
						updateConfig,
						imports: virtualImports,
					});

					for (const [name, buffer] of Object.entries(interfaceBuffers)) {
						if (!buffer) continue;
						themeTypesBuffer += `
							declare interface ${name} {
								"${themeName}": {
									${buffer}
								}
							}
						`;
					}

					for (const [name, buffer] of Object.entries(moduleBuffers)) {
						if (!buffer) continue;
						themeTypesBuffer += `
							declare module "${name}" {
								${buffer}
							}
						`;
					}

					// Write generated types to .d.ts file
					addDts({
						name: themeName,
						content: themeTypesBuffer,
						root: config.root,
						srcDir: config.srcDir,
						logger,
					});
				},
			},
		};
	};
}

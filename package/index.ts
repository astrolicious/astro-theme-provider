import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroDbIntegration } from "@astrojs/db/types";
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
import { mergeOptions } from "./utils/options.ts";
import { PackageJSON, warnThemePackage } from "./utils/package.ts";
import {
	addLeadingSlash,
	normalizePath,
	removeTrailingSlash,
	resolveDirectory,
	resolveFilepath,
	validatePattern,
} from "./utils/path.ts";
import {
	toModuleObject,
	createVirtualModule,
	generateTypesFromModule,
	globToModuleObject,
	isEmptyModuleObject,
	mergeModuleObjects,
	resolveModuleObject,
} from "./utils/virtual.ts";

const thisFile = resolveFilepath("./", import.meta.url);
const thisRoot = resolveDirectory("./", thisFile);

export default function <Schema extends z.ZodTypeAny>(partialAuthorOptions: AuthorOptions<Schema>) {
	// Theme package entrypoint (/package/index.ts)
	const themeEntrypoint = callsites()
		.reverse()
		.map((callsite) => (callsite as NodeJS.CallSite).getScriptNameOrSourceURL())
		// Assume the first path before `file://` path is the entrypoint
		.find((path) => path && !path.startsWith("file://") && path !== thisFile)!;

	// Theme package root (/package)
	const themeRoot = resolveDirectory("./", themeEntrypoint);

	// Default options
	let authorOptions = {
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
	authorOptions = mergeOptions(authorOptions, partialAuthorOptions) as Required<AuthorOptions<z.ZodRecord>>;

	// Theme source dir (/package/src)
	const themeSrc = resolveDirectory(themeRoot, authorOptions.srcDir);

	// Force options
	authorOptions = mergeOptions(authorOptions, {
		pageDir: { cwd: themeSrc },
		publicDir: { cwd: themeSrc },
	}) as Required<AuthorOptions<z.ZodRecord>>;

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

	// Return theme integration
	return ({
		config: userConfigUnparsed,
		pages: userPages = {},
		overrides: userOverrides = {},
	}: UserOptions<Schema>): AstroIntegration | AstroDbIntegration => {
		// Parse/validate config passed by user, throw formatted error if it is invalid
		const parsed = authorOptions.schema.safeParse(userConfigUnparsed, { errorMap });

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
				// Support `@astrojs/db` (Astro Studio)
				"astro:db:setup": ({ extendDb }) => {
					const configEntrypoint = resolve(themeRoot, "db/cofig.ts");
					const seedEntrypoint = resolve(themeRoot, "db/seed.ts");
					if (existsSync(configEntrypoint)) extendDb({ configEntrypoint });
					if (existsSync(seedEntrypoint)) extendDb({ seedEntrypoint });
				},
				"astro:config:setup": ({ command, config, logger, updateConfig, addWatchFile, injectRoute }) => {
					const projectRoot = normalizePath(fileURLToPath(config.root.toString()));

					// Record of virtual imports and their content
					const virtualImports: Record<string, string> = {
						[`${themeName}/config`]: `export default ${JSON.stringify(userConfig)}`,
					};

					// Module type buffers
					const moduleBuffers: Record<string, string> = {
						[`${themeName}/config`]: "\nconst config: ThemeConfig;\nexport default config;",
					};

					// Interface type buffers
					const interfaceBuffers = {
						AstroThemeExports: "",
						AstroThemeExportOverrides: "",
						AstroThemeExportsResolved: "",
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

						declare type GetAstroThemeExports<Name extends keyof AstroThemeConfigs> = AstroThemeExports[Name]

						declare type AstroThemeExportOverrideOptions<Name extends keyof AstroThemeConfigs, Imports = GetAstroThemeExports<Name>> = {
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

					// Add `astro-public` integration to handle `/public` folder logic
					addIntegration({
						integration: staticDir(authorOptions.publicDir!),
						config,
						logger,
						updateConfig,
					});

					// Dynamically create virtual modules using globs, imports, or exports
					for (let [name, option] of Object.entries(authorOptions.modules)) {
						if (!option) continue;

						// Reserved module/import names
						if (["config", "pages", "public", "content", "db"].includes(name)) {
							logger.warn(`Module name '${name}' is reserved for the built in virtual import '${themeName}/${name}'`);
							continue;
						}

						const moduleName = normalizePath(join(themeName, name));
						const moduleRoot = normalizePath(resolve(themeSrc, name));

						// Turn a glob string into a module object
						if (typeof option === "string") {
							option = globToModuleObject(moduleRoot, option);
						}

						// Create virtual module object
						const virtualModule = createVirtualModule(moduleName, themeRoot, toModuleObject(option));

						let interfaceTypes = virtualModule.types.interface();

						// Add generated types to interface buffer
						interfaceBuffers["AstroThemeExports"] += `
							"${name}": ${interfaceTypes ? `{\n${interfaceTypes}\n}` : "string[]"},
						`;

						const override = userOverrides[name as keyof GetAstroThemeExports<ThemeName>];

						// Check if module exists and contains overrides
						if (override) {
							const altModuleName = moduleName.replace(/\//, ":");
							const moduleOverride = createVirtualModule(altModuleName, projectRoot, toModuleObject(override));
							if (!isEmptyModuleObject(moduleOverride)) {
								// Add virtual module to import buffer
								virtualImports[altModuleName] = virtualModule.content();

								// Add generated types to module buffer
								moduleBuffers[altModuleName] = moduleOverride.types.module();

								// Add generated types to interface buffer
								interfaceBuffers["AstroThemeExportOverrides"] += `
									"${name}": {
										${moduleOverride.types.interface()}
									},
								`;

								// Merge module override into virtual module
								virtualModule.merge(moduleOverride);
							}
						}

						// Add virtual module to import buffer
						virtualImports[moduleName] = virtualModule.content();

						// Add generated types to module buffer
						moduleBuffers[moduleName] = virtualModule.types.module();

						interfaceTypes = virtualModule.types.interface();

						// Add generated types to interface buffer
						interfaceBuffers["AstroThemeExportsResolved"] += `
							"${name}": ${interfaceTypes ? `{\n${interfaceTypes}\n}` : "string[]"},
						`;
					}

					const pageDirOption = {
						...(authorOptions.pageDir as PageDirOption),
						config,
						logger,
					} as PageDirIntegrationOption;

					// Initialize route injection
					const { pages, injectPages } = addPageDir(pageDirOption);

					// Generate types for possibly injected routes
					interfaceBuffers["AstroThemePagesAuthored"] += Object.entries(pages)
						.map(([pattern, entrypoint]) => `\n"${pattern}": typeof import("${entrypoint}").default`)
						.join("");

					// Buffer for AstroThemePagesOverrides interface
					let pageOverrideBuffer = "";

					// Filter out routes the theme user toggled off
					for (const oldPattern of Object.keys(userPages)) {
						// Skip pages that are not defined by author
						if (!pages?.[oldPattern!]) continue;

						let newPattern = userPages[oldPattern as keyof typeof userPages];

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
							// Add new pattern
							pages[newPattern] = pages[oldPattern]!;
							// Remove old pattern
							delete pages[oldPattern];
							// Add types to buffer
							pageOverrideBuffer += `\n"${oldPattern}": "${newPattern}";`;

							continue;
						}
					}

					// Add generated types to interface buffer
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

					// Add interfaces to global type buffer
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

					// Add modules to global type buffer
					for (const [name, buffer] of Object.entries(moduleBuffers)) {
						if (!buffer) continue;
						themeTypesBuffer += `
							declare module "${name}" {
								${buffer}
							}
						`;
					}
					
					// Write compiled types to .d.ts file
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

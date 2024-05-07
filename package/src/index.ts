import { existsSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroDbIntegration } from "@astrojs/db/types";
import { addDts, addIntegration, addVirtualImports, watchDirectory } from "astro-integration-kit";
import { addPageDir } from "astro-pages";
import type { IntegrationOption as PageDirIntegrationOption, Option as PageDirOption } from "astro-pages";
import staticDir from "astro-public";
import type { Option as PublicDirOption } from "astro-public/types";
import { AstroError } from "astro/errors";
import { z } from "astro/zod";
import callsites from "callsites";
import fg from "fast-glob";
import { GLOB_ASTRO, GLOB_COMPONENTS, GLOB_CSS, GLOB_IGNORE, GLOB_IMAGES } from "./internal/consts.js";
import { errorMap } from "./internal/error-map.js";
import type { AuthorOptions, UserOptions } from "./internal/types.js";
import { mergeOptions } from "./utils/options.js";
import { PackageJSON, warnThemePackage } from "./utils/package.js";
import {
	addLeadingSlash,
	normalizePath,
	removeTrailingSlash,
	resolveDirectory,
	resolveFilepath,
	validatePattern,
} from "./utils/path.js";
import { createVirtualModule, globToModuleObject, isEmptyModuleObject, toModuleObject } from "./utils/virtual.js";

const thisFile = resolveFilepath("./", import.meta.url);

export default function <ThemeName extends string, Schema extends z.ZodTypeAny>(
	partialAuthorOptions: AuthorOptions<ThemeName, Schema>,
) {
	// Theme package entrypoint (/package/index.ts)
	const themeEntrypoint = callsites()
		.reverse()
		.map((callsite) => (callsite as NodeJS.CallSite).getScriptNameOrSourceURL())
		// Assume the first path before `file://` path is the entrypoint
		.find((path) => path && !path.startsWith("file://") && path !== thisFile)!;

	// Default options
	let authorOptions: Required<AuthorOptions<string, z.ZodRecord>> = {
		name: "",
		entrypoint: themeEntrypoint,
		srcDir: "src",
		pageDir: "pages",
		publicDir: "public",
		middlewareDir: "./",
		log: true,
		schema: z.record(z.any()),
		imports: {
			css: `css/${GLOB_CSS}`,
			assets: `assets/${GLOB_IMAGES}`,
			layouts: `layouts/${GLOB_ASTRO}`,
			components: `components/${GLOB_COMPONENTS}`,
		},
		integrations: [() => staticDir(authorOptions.publicDir)],
	};

	if (typeof authorOptions.pageDir === "string") {
		authorOptions.pageDir = { dir: authorOptions.pageDir } as PageDirOption;
	}

	if (typeof authorOptions.publicDir === "string") {
		authorOptions.publicDir = { dir: authorOptions.publicDir } as PublicDirOption;
	}

	// Merge author options with default options
	authorOptions = mergeOptions(authorOptions, partialAuthorOptions) as typeof authorOptions;

	// Theme package root (/package)
	const themeRoot = resolveDirectory("./", authorOptions.entrypoint);

	// Theme source dir (/package/src)
	const themeSrc = resolveDirectory(themeRoot, authorOptions.srcDir);

	// Root dir used to search for middleware files
	const middlewareDir = authorOptions.middlewareDir ? resolveDirectory(themeSrc, authorOptions.middlewareDir) : false;

	// Force options
	authorOptions = mergeOptions(authorOptions, {
		pageDir: { cwd: themeSrc, log: authorOptions.log },
		publicDir: { cwd: themeRoot, log: authorOptions.log },
		middlewareDir,
	}) as typeof authorOptions;

	// Theme `package.json`
	const themePackage = new PackageJSON(themeRoot);

	// Assign theme name
	const themeName = authorOptions.name;

	// Return theme integration
	return (userOptions: UserOptions<ThemeName, Schema> = {}) => {
		const { config: userConfigUnparsed = {}, pages: userPages = {}, overrides: userOverrides = {} } = userOptions;

		// Parse/validate config passed by user, throw formatted error if it is invalid
		const parsed = authorOptions.schema.safeParse(userConfigUnparsed, { errorMap });

		if (!parsed.success) {
			throw new AstroError(
				`Invalid configuration passed to '${themeName}' integration\n`,
				parsed.error.issues.map((i) => i.message).join("\n"),
			);
		}

		const userConfig = parsed.data;

		const themeIntegration: AstroDbIntegration = {
			name: themeName,
			hooks: {
				// Support `@astrojs/db` (Astro Studio)
				"astro:db:setup": ({ extendDb }) => {
					const configEntrypoint = resolve(themeRoot, "db/cofig.ts");
					const seedEntrypoint = resolve(themeRoot, "db/seed.ts");
					if (existsSync(configEntrypoint)) extendDb({ configEntrypoint });
					if (existsSync(seedEntrypoint)) extendDb({ seedEntrypoint });
				},
				"astro:config:setup": (params) => {
					const { config, logger, injectRoute, addMiddleware } = params;

					const projectRoot = normalizePath(fileURLToPath(config.root.toString()));

					// Record of virtual imports and their content
					const virtualImports: Record<string, string> = {
						[`${themeName}:config`]: `export default ${JSON.stringify(userConfig)}`,
					};

					// Module type buffers
					const moduleBuffers: Record<string, string> = {
						[`${themeName}:config`]: `
							const config: NonNullable<NonNullable<Parameters<typeof import("${themeEntrypoint}").default>[0]>["config"]>;
							export default config;
						`,
					};

					// Interface type buffers
					const interfaceBuffers = {
						ThemeExports: "",
						ThemeExportsResolved: "",
						ThemeRoutes: "",
						ThemeRoutesResolved: "",
					};

					let themeTypesBuffer = `
						type ThemeName = "${themeName}";
						type ThemeConfig = NonNullable<NonNullable<Parameters<typeof import("${themeEntrypoint}").default>[0]>["config"]>

						declare namespace AstroThemeProvider {
								export interface Themes {
										"${themeName}": true;
								}
						
								export interface ThemeConfigs {
										"${themeName}": ThemeConfig;
								};
						
								export interface ThemePages {
										"${themeName}": ThemeRoutesResolved
								}
						
								export interface ThemeOverrides {
										"${themeName}": ThemeExportsResolved
								}
						
								export interface ThemeOptions {
										"${themeName}": {
												pages?: { [Pattern in keyof ThemeRoutes]?: string | boolean }
												overrides?: {
														[Module in keyof ThemeExports]?:
																ThemeExports[Module] extends Record<string, any>
																		? ThemeExports[Module] extends string[]
																				?	string[]
																				: { [Export in keyof ThemeExports[Module]]?: string }
																		: never
												} & {};
										};
								}
						}
					`;

					if (authorOptions.log) {
						// Warn about issues with theme's `package.json`
						warnThemePackage(themePackage, logger);
					}

					// HMR for theme author's package
					watchDirectory(params, themeRoot);

					// Add integrations from author (like mdx or sitemap)
					for (const option of authorOptions.integrations) {
						let integration: ReturnType<Extract<typeof option, (...args: any[]) => any>>;
						if (typeof option === "function") {
							const names = config.integrations.map((i) => i.name);
							integration = option({ config: userConfig, integrations: names });
						} else {
							integration = option;
						}
						if (!integration) continue;
						addIntegration(params, { integration });
					}

					// Add middleware
					if (middlewareDir) {
						const middlewareGlob = ["middleware.{ts,js}", "middleware/*{ts,js}", GLOB_IGNORE].flat();
						const middlewareEntrypoints = fg.globSync(middlewareGlob, { cwd: middlewareDir, absolute: true });

						for (const entrypoint of middlewareEntrypoints) {
							const name = basename(entrypoint).slice(0, -extname(entrypoint).length);
							if (["middleware", "index", "pre"].includes(name)) {
								addMiddleware({ entrypoint, order: "pre" });
							}
							if (name === "post") {
								addMiddleware({ entrypoint, order: "post" });
							}
						}
					}

					// Dynamically create virtual modules using globs, imports, or exports
					for (let [name, option] of Object.entries(authorOptions.imports)) {
						if (!option) continue;

						// Reserved module/import names
						if (["config", "pages", "content", "db"].includes(name)) {
							logger.warn(`Module name '${name}' is reserved for the built in virtual import '${themeName}:${name}'`);
							continue;
						}

						const moduleName = normalizePath(join(themeName, name)).replace(/\//, ':');

						// Turn a glob string into a module object
						if (typeof option === "string") {
							option = globToModuleObject(themeSrc, option);
						}

						// Create virtual module object
						const virtualModule = createVirtualModule(moduleName, themeRoot, toModuleObject(option));

						let interfaceTypes = virtualModule.types.interface();

						// Add generated types to interface buffer
						interfaceBuffers.ThemeExports += `
							"${name}": ${interfaceTypes ? `{\n${interfaceTypes}\n}` : JSON.stringify(virtualModule.imports)},
						`;

						const override = userOverrides[name];

						// Check if module exists and contains overrides
						if (override) {
							const altModuleName = moduleName.replace(/:/, "::");
							const moduleOverride = createVirtualModule(altModuleName, projectRoot, toModuleObject(override));
							if (!isEmptyModuleObject(moduleOverride)) {
								// Add virtual module to import buffer
								virtualImports[altModuleName] = virtualModule.content();

								// Add generated types to module buffer
								moduleBuffers[altModuleName] = moduleOverride.types.module();

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
						interfaceBuffers.ThemeExportsResolved += `
							"${name}": ${interfaceTypes ? `{\n${interfaceTypes}\n}` : JSON.stringify(virtualModule.imports)},
						`;
					}

					const pageDirOption: PageDirIntegrationOption = {
						...(authorOptions.pageDir as PageDirOption),
						config,
						logger,
					};

					// Initialize route injection
					const { pages, injectPages } = addPageDir(pageDirOption);

					// Generate types for possibly injected routes
					interfaceBuffers.ThemeRoutes += Object.entries(pages)
						.map(([pattern, entrypoint]) => `\n"${pattern}": typeof import("${entrypoint}").default`)
						.join("");

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
									"Invalid page override, pattern must contain the same params in the same location",
									`New: ${newPattern}\nOld: ${oldPattern}`,
								);
							}
							// Add new pattern
							pages[newPattern] = pages[oldPattern]!;
							// Remove old pattern
							delete pages[oldPattern];
						}
					}

					// Generate types for injected routes
					interfaceBuffers.ThemeRoutesResolved += Object.entries(pages)
						.map(([pattern, entrypoint]) => `\n"${pattern}": typeof import("${entrypoint}").default`)
						.join("");

					// Inject routes/pages
					injectPages(injectRoute);

					// Add virtual modules
					addVirtualImports(params, {
						name: themeName,
						imports: virtualImports,
					});

					// Add interfaces to global type buffer
					for (const [name, buffer] of Object.entries(interfaceBuffers)) {
						if (!buffer) continue;
						themeTypesBuffer += `
							interface ${name} {
								${buffer}
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
					addDts(params, {
						name: themeName,
						content: themeTypesBuffer,
					});
				},
			},
		};

		return themeIntegration;
	};
}

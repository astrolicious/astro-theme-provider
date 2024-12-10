import { existsSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import type { AstroIntegration } from "astro";
import { addDts, addIntegration, addVitePlugin, watchDirectory } from "astro-integration-kit";
import { addPageDir } from "astro-pages";
import type { IntegrationOption as PageDirIntegrationOption } from "astro-pages";
import staticDir from "astro-public";
import { AstroError } from "astro/errors";
import { z } from "astro/zod";
import callsites from "callsites";
import fg from "fast-glob";
import { GLOB_ASTRO, GLOB_COMPONENTS, GLOB_IGNORE, GLOB_IMAGES, GLOB_STYLES } from "./internal/consts.js";
import { errorMap } from "./internal/error-map.js";
import type { AuthorOptions, UserOptions } from "./internal/types.js";
import {
	createVirtualModule,
	globToModuleObject,
	isEmptyModuleObject,
	resolveModuleObject,
	toModuleObject,
} from "./utils/modules.ts";
import { PackageJSON, warnThemePackage } from "./utils/package.js";
import {
	addLeadingSlash,
	normalizePath,
	removeTrailingSlash,
	resolveDirectory,
	resolveFilepath,
	validatePattern,
} from "./utils/path.js";
import { createVirtualResolver } from "./utils/resolver.ts";

const thisFile = resolveFilepath("./", import.meta.url);

export default function <ThemeName extends string, Schema extends z.ZodTypeAny>(
	partialAuthorOptions: AuthorOptions<ThemeName, Schema>,
) {
	let {
		log: logLevel = true,
		name: themeName,
		schema: configSchema = z.any(),
		entrypoint: themeEntrypoint = callsites()
			.map((callsite) => (callsite as NodeJS.CallSite).getScriptNameOrSourceURL())
			.find((path) => path && !path.startsWith("file://") && path !== thisFile)!,
		srcDir: themeSrc = "src",
		pageDir = "pages",
		publicDir = "public",
		middlewareDir = "./",
		imports: themeImports = {},
		integrations: themeIntegrations = [],
	} = partialAuthorOptions;

	themeEntrypoint = resolveFilepath("./", themeEntrypoint);

	const themeRoot = resolveDirectory("./", themeEntrypoint);

	const themePackage = new PackageJSON(themeRoot);

	themeSrc = resolveDirectory(themeRoot, themeSrc);

	if (middlewareDir) {
		middlewareDir = resolveDirectory(themeSrc, middlewareDir);
	}

	if (typeof pageDir === "string") {
		pageDir = { dir: pageDir };
	}

	pageDir = { ...pageDir, cwd: themeSrc, log: logLevel };

	if (publicDir || typeof publicDir === "string") {
		if (typeof publicDir === "string") {
			publicDir = { dir: publicDir };
		}
		publicDir = { ...publicDir, cwd: themeRoot, log: logLevel };
	}

	themeImports = {
		assets: `assets/${GLOB_IMAGES}`,
		components: `components/${GLOB_COMPONENTS}`,
		layouts: `layouts/${GLOB_ASTRO}`,
		styles: `styles/${GLOB_STYLES}`,
		...themeImports,
	};

	// Return theme integration
	return (userOptions: UserOptions<ThemeName, Schema> = {}) => {
		const { config: userConfigPartial = {}, pages: userPages = {}, overrides: userOverrides = {} } = userOptions;

		// Parse/validate config passed by user, throw formatted error if it is invalid
		const {
			data: userConfig,
			success: parseSuccess,
			error: parseError,
		} = configSchema.safeParse(userConfigPartial, { errorMap });

		if (!parseSuccess) {
			throw new AstroError(
				`Invalid configuration passed to '${themeName}' integration\n`,
				parseError.issues.map((issue) => issue.message).join("\n"),
			);
		}

		const themeIntegration: AstroIntegration = {
			name: themeName,
			hooks: {
				// How should this get typed? Return type should be "AstroIntegration" but this requires "AstroDbIntegration"
				// @ts-expect-error
				"astro:db:setup": ({ extendDb }) => {
					const configEntrypoint = resolve(themeRoot, "db/cofig.ts");
					const seedEntrypoint = resolve(themeRoot, "db/seed.ts");
					if (existsSync(configEntrypoint)) extendDb({ configEntrypoint });
					if (existsSync(seedEntrypoint)) extendDb({ seedEntrypoint });
				},
				"astro:config:setup": (params) => {
					const { config, logger, injectRoute, addMiddleware } = params;

					const projectRoot = resolveDirectory("./", config.root);

					// Record of virtual imports and their content
					const virtualImports: Parameters<typeof createVirtualResolver>[0]["imports"] = {
						[`${themeName}:config`]: `export default ${JSON.stringify(userConfig)}`,
						[`${themeName}:context`]: "",
					};

					// Module type buffers
					const moduleBuffers: Record<string, string> = {
						[`${themeName}:config`]: `
							const config: NonNullable<NonNullable<Parameters<typeof import("${themeEntrypoint}").default>[0]>["config"]>;
							export default config;
						`,
						[`${themeName}:context`]: "",
					};

					// Interface type buffers
					const interfaceBuffers = {
						ThemeExports: "",
						ThemeRoutes: "",
						ThemeIntegrations: "",
						ThemeIntegrationsResolved: "",
					};

					let themeTypesBuffer = `
						type ThemeName = "${themeName}";

						declare namespace AstroThemeProvider {
								export interface Themes {
										"${themeName}": true;
								}

								export interface ThemeOptions {
										"${themeName}": {
												pages?: { [Pattern in keyof ThemeRoutes]?: string | boolean } & {}
												overrides?: {
														[Module in keyof ThemeExports]?:
																ThemeExports[Module] extends Record<string, any>
																		? ThemeExports[Module] extends string[]
																				?	string[]
																				: { [Export in keyof ThemeExports[Module]]?: string }
																		: never
												} & {}
												integrations?: keyof ThemeIntegrationsResolved extends never
													? \`\$\{ThemeName\} is not injecting any integrations\`
													: { [Name in keyof ThemeIntegrationsResolved]?: boolean } & {}
										};
								}
						}
					`;

					if (logLevel) {
						// Warn about issues with theme's `package.json`
						warnThemePackage(themePackage, logger);
					}

					// HMR for theme author's package
					watchDirectory(params, themeRoot);

					// Sideload integration to handle the public directory
					if (publicDir && existsSync(resolveDirectory(publicDir.cwd!, publicDir.dir, false))) {
						addIntegration(params, { integration: staticDir(publicDir) });
					}

					// Integrations inside the config (including the theme) and integrations injected by the theme
					const integrationsExisting: Record<string, true> = Object.fromEntries(
						config.integrations.map((i) => [i.name, true]),
					);
					// Integrations added by a theme but possibly do not exist because a user disabled it
					const integrationsPossible: Record<string, true> = {};
					// Integrations that are injected into a theme
					const integrationsInjected: Record<string, true> = {};
					// Integrations ignored/disabled by a user
					const integrationsIgnored: Record<string, false> = {};

					for (const option of themeIntegrations) {
						let integration: ReturnType<Extract<typeof option, (...args: any[]) => any>>;

						// Handle integration options that might be a callback for conditonal injection
						if (typeof option === "function") {
							integration = option({ config: userConfig, integrations: Object.keys(integrationsExisting) });
						} else {
							integration = option;
						}

						if (!integration) continue;

						const { name } = integration;

						integrationsPossible[name] = true;

						// Allow users to ignore/disable an integration
						if (userOptions.integrations && name in userOptions.integrations && !userOptions.integrations[name]) {
							integrationsIgnored[name] = false;
							continue;
						}

						integrationsInjected[name] = true;
						integrationsExisting[name] = true;

						// Add the integration
						addIntegration(params, { integration });
					}

					// Virtual module for integration utilities
					virtualImports[`${themeName}:context`] += `\nexport const integrations = new Set(${JSON.stringify(
						Array.from(Object.keys(integrationsExisting)),
					)})`;
					moduleBuffers[`${themeName}:context`] += `\nexport const integrations: Set<string>`;

					// Type interfaces for theme integrations, used to build other types like the user config
					interfaceBuffers.ThemeIntegrations = `${JSON.stringify(integrationsPossible, null, 4).slice(1, -1)}` || "\n";
					interfaceBuffers.ThemeIntegrationsResolved =
						`${JSON.stringify({ ...integrationsInjected, ...integrationsIgnored }, null, 4).slice(1, -1)}` || "\n";

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

					// Reserved names for built-in virtual modules
					const reservedNames = new Set(["config", "context", "content", "collections", "db"]);

					// Dynamically create virtual modules using globs, imports, or exports
					for (let [name, option] of Object.entries(themeImports)) {
						if (!option) continue;

						// Reserved module/import names
						if (reservedNames.has(name)) {
							logger.warn(`Module name '${name}' is reserved for the built in virtual import '${themeName}:${name}'`);
							continue;
						}

						// Turn a glob string into a module object
						if (typeof option === "string") {
							option = globToModuleObject(themeSrc, option);
						}

						const moduleName = normalizePath(join(themeName, name)).replace(/\//, ":");

						const resolvedModuleObject = resolveModuleObject(themeRoot, toModuleObject(option));

						const virtualModule = createVirtualModule(moduleName, resolvedModuleObject);

						const orignalContent = virtualModule.content();

						virtualImports[moduleName] = orignalContent;

						const virtualModuleOverride = createVirtualModule(moduleName, resolvedModuleObject);

						const resolvedModuleOverride =
							name in userOverrides ? resolveModuleObject(projectRoot, toModuleObject(userOverrides[name]!)) : null;

						const isEmptyOverride = resolvedModuleOverride ? isEmptyModuleObject(resolvedModuleOverride) : true;

						if (!isEmptyOverride) {
							virtualModuleOverride.merge(resolvedModuleOverride!);
						}

						const overrideContent = virtualModuleOverride.content();

						if (!isEmptyOverride) {
							const overrideExports = new Set(Object.values(virtualModuleOverride.exports));
							if (overrideExports.size > 0) {
								virtualImports[moduleName] = ({ importer }) => {
									if (importer && overrideExports.has(importer)) {
										return orignalContent;
									}
									return overrideContent;
								};
							} else {
								virtualImports[moduleName] = overrideContent;
							}
						}

						moduleBuffers[moduleName] = virtualModule.types.module();

						const interfaceTypes = virtualModule.types.interface();

						interfaceBuffers.ThemeExports += `
							"${name}": ${interfaceTypes ? `{\n${interfaceTypes}\n}` : JSON.stringify(virtualModule.imports)},
						`;
					}

					const pageDirOption: PageDirIntegrationOption = { ...pageDir, config, logger };

					// Initialize route injection
					const { pages: pagesInjected, injectPages } = addPageDir(pageDirOption);

					const pagesResolved: Record<string, string | false> = Object.fromEntries(
						Object.keys(pagesInjected).map((pattern) => [pattern, pattern]),
					);

					// Generate types for possibly injected routes
					interfaceBuffers.ThemeRoutes += Object.keys(pagesInjected)
						.map((pattern) => `\n"${pattern}": true`)
						.join("");

					// Filter out routes the theme user toggled off
					for (const oldPattern of Object.keys(userPages)) {
						// Skip pages that are not defined by author
						if (!pagesInjected?.[oldPattern!]) continue;

						let newPattern = userPages[oldPattern as keyof typeof userPages];

						// If user passes falsy value remove the route
						if (!newPattern) {
							pagesResolved[oldPattern] = false;
							delete pagesInjected[oldPattern];
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
							pagesInjected[newPattern] = pagesInjected[oldPattern]!;
							pagesResolved[oldPattern] = newPattern;
							// Remove old pattern
							delete pagesInjected[oldPattern];
						}
					}

					// Virtual module for integration utilities
					virtualImports[`${themeName}:context`] += `\nexport const pages = new Map(Object.entries(${JSON.stringify(
						pagesResolved,
					)}))`;
					moduleBuffers[`${themeName}:context`] += `\nexport const pages: Map<${Object.keys(pagesResolved)
						.map((p) => `"${p}"`)
						.join(" | ")}, string | false>`;

					// Inject routes/pages
					injectPages(injectRoute);

					// Add virtual modules
					addVitePlugin(params, {
						plugin: createVirtualResolver({
							name: themeName,
							imports: virtualImports,
						}),
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

import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { addDts, addIntegration, addVirtualImports, watchIntegration } from "astro-integration-kit/utilities";
import { addPageDir } from "astro-pages";
import type { IntegrationOption as PageIntegrationOption } from "astro-pages/types";
import staticDir from "astro-public";
import { AstroError } from "astro/errors";
import callsites from "callsites";
// @ts-ignore
import validatePackageName from "validate-npm-package-name";
import { type AuthorOptions, type ConfigDefault, type ModuleOptions, type UserOptions } from "./types";
import { GLOB_ASTRO, GLOB_COMPONENTS, GLOB_CSS, GLOB_IMAGES } from "./utils/consts.ts";
import { PackageJSON, warnThemePackage } from "./utils/package.ts";
import { addLeadingSlash, normalizePath, stringToDirectory, stringToFilepath, validatePattern } from "./utils/path.ts";
import { getVirtualModuleTypes, globToModuleObject, virtualModuleObject } from "./utils/virtual.ts";
import { errorMap } from "./utils/error-map.ts";

const thisFile = stringToFilepath("./", import.meta.url);
const thisRoot = stringToDirectory("./", thisFile)

export default function <Config extends ConfigDefault>(authorOptions: AuthorOptions<Config>) {
	if (!authorOptions.entrypoint) {
		// Assume the first path before `file://` URL is the theme package's entrypoint
		for (const callsite of callsites().reverse()) {
			const file = (callsite as NodeJS.CallSite).getScriptNameOrSourceURL();
			if (file && !file.startsWith("file://") && file !== thisFile) {
				authorOptions.entrypoint = file;
				break;
			}
		}
	}

	// Theme package entrypoint (/package/index.ts)
	const themeEntrypoint = stringToFilepath("./", authorOptions.entrypoint!);

	// Theme package root (/package)
	const themeRoot = stringToDirectory("./", themeEntrypoint);

	// Theme src dir (/package/src)
	const themeSrc = stringToDirectory(themeRoot, authorOptions.srcDir || "src")

	// Theme `package.json`
	const themePackage = new PackageJSON(themeRoot);

	// Assign theme name
	const themeName = themePackage.json.name || authorOptions.name || "my-theme";

	// Validate that the theme name is a valid package name
	const isValidName = validatePackageName(themeName);

	if (!isValidName.validForNewPackages) {
		throw new AstroError(
			`Theme name is not a valid package name!`,
			[...isValidName.errors, ...isValidName.warnings].join(", "),
		);
	}
	
	// Will be assigned value when 'astro:config:setup' hook runs
	let srcDir: string;
	let publicDir: string;
	let outDir: string;

	return (userOptions: UserOptions<Config>): AstroIntegration => {
		const parsed = authorOptions.schema.safeParse(userOptions.config, { errorMap });

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
				"astro:db:setup": ({ extendDb }) => {
					const configEntrypoint = resolve(cwd, "db/cofig.ts");
					const seedEntrypoint = resolve(cwd, "db/seed.ts");
					if (existsSync(configEntrypoint)) extendDb({ configEntrypoint });
					if (existsSync(seedEntrypoint)) extendDb({ seedEntrypoint });
				},
				"astro:config:setup": ({ command, config, logger, updateConfig, addWatchFile, injectRoute }) => {
					srcDir = stringToDirectory("./", config.srcDir.toString());
					publicDir = stringToDirectory("./", config.publicDir.toString());
					outDir = stringToDirectory("./", config.outDir.toString());

					const moduleBuffers: Record<string, string> = {};

					const interfaceBuffers = {
						AstroThemeModulesAuthored: "",
						AstroThemeModulesOverrides: "",
						AstroThemeModulesInjected: "",
						AstroThemePagesAuthored: "",
						AstroThemePagesOverrides: "",
						AstroThemePagesInjected: "",
					};

					const virtualImports: Record<string, string> = {
						[themeName + "/config"]: `export default ${JSON.stringify(userConfig)}`,
					};

					let themeTypesBuffer = `
						type Prettify<T> = { [K in keyof T]: T[K]; } & {};

						type ThemeName = "${themeName}";
						type ThemeConfig = NonNullable<Parameters<typeof import("${themeEntrypoint}").default>[0]>["config"]

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
						
						declare type AstroThemePagesOptions<Name extends keyof AstroThemePagesAuthored> = Prettify<Partial<Record<keyof AstroThemePagesAuthored[Name], string | boolean>>>
						
						declare module "${themeName}" {
							const config: ThemeConfig;
							export default config;
						}
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

					// Initialize "public" directory
					authorOptions.public ||= "public"
					addIntegration({
						integration: staticDir(
							typeof authorOptions.public === "string"
								? { dir: authorOptions.public, cwd: themeRoot }
								: { ...authorOptions.public, cwd: themeRoot }
						),
						config,
						logger,
						updateConfig,
					});

					/*

					
							Virtual Imports/Modules/Overrides


					*/

					// Default assign default options for virtual modules
					const moduleOptions: ModuleOptions = {
						css: GLOB_CSS,
						assets: GLOB_IMAGES,
						layouts: GLOB_ASTRO,
						components: GLOB_COMPONENTS,
						...authorOptions.modules
					};

					// Dynamically create virtual modules using globs, imports, or exports
					for (const [name, path] of Object.entries(moduleOptions)) {
						if (!path) continue;

						if (["config", "pages", "public", "content", "db"].includes(name)) {
							logger.warn(`Export name '${name}' is reserved for the built in virtual import '${themeName}/${name}'`);
							continue;
						}

						const moduleName = normalizePath(join(themeName, name));
						const moduleRoot = normalizePath(resolve(themeRoot, name));

						let virtualModule = {} as ReturnType<typeof virtualModuleObject>;

						if (typeof path === "string") {
							virtualModule = virtualModuleObject(moduleName, globToModuleObject(moduleRoot, path));
						}

						if (typeof path === "object") {
							if (Array.isArray(path)) {
								if (path.length < 1) continue;
								virtualModule = virtualModuleObject(moduleName, { imports: path });
							} else {
								virtualModule = virtualModuleObject(moduleName, { exports: path });
							}
						}

						console.log("RESOLVED MODULE", virtualModule);

						if (!virtualModule?.name) continue;

						let typesObjectContent = getVirtualModuleTypes(virtualModule, ({ name, type }) => `\n${name}: ${type}`);
						let typesModuleContent = getVirtualModuleTypes(virtualModule, ({ name, type }) => `\nexport const ${name}: ${type}`);

						interfaceBuffers["AstroThemeModulesAuthored"] += `
							"${moduleName}": {
								${typesObjectContent}
							},
						`;

						if (userConfig.overrides) {
							// This is meant to be a temporary fix/workaround for ciruclar imports when overriding
							const altModuleName = moduleName.replace(/\//, ":")

							virtualImports[altModuleName] = virtualModule.content;

							moduleBuffers[altModuleName] = typesModuleContent;

							interfaceBuffers["AstroThemeModulesOverrides"] += `
								"${moduleName}": {
									${typesObjectContent}
								},
							`;
						}

						// Re-generate content to include user overrides
						typesObjectContent = getVirtualModuleTypes(virtualModule, ({ name, type }) => `\n${name}: ${type}`);
						typesModuleContent = getVirtualModuleTypes(virtualModule, ({ name, type }) => `\nexport const ${name}: ${type}`);

						interfaceBuffers["AstroThemeModulesInjected"] += `
							"${moduleName}": {
								${typesObjectContent}
							},
						`;

						// Create virtuaL import
						virtualImports[moduleName] = virtualModule.content;

						// Generate types for virtual import
						moduleBuffers[moduleName] = typesModuleContent
					}

					/*
					

							Pages/Routing


					*/

					// Handle 'authorOptions.pages' default
					authorOptions.pages ||= "pages"

					if (typeof authorOptions.pages === "string") {
						authorOptions.pages = { dir: authorOptions.pages };
					}

					Object.assign(authorOptions.pages, { cwd: themeRoot, config, logger });

					// Initialize route injection
					const { pages, injectPages } = addPageDir(authorOptions.pages as PageIntegrationOption);

					userOptions.pages ??= {} as NonNullable<typeof userOptions.pages>;

					// Generate types for possibly injected routes
					// addLinesToDtsInterface(
					// 	"AstroThemePagesAuthored",
					// 	wrapWithBrackets(
					// 		Object.entries(pages).map(
					// 			([pattern, entrypoint]) => `"${pattern}": typeof import("${entrypoint}").default;`,
					// 		),
					// 		`"${themeName}": `,
					// 	),
					// );

					// Buffer for AstroThemePagesOverrides interface
					let typesPageBuffer = "";

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
							newPattern = addLeadingSlash(newPattern);
							if (!newPattern.startsWith("/")) newPattern = `/${newPattern}`;
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
							typesPageBuffer += `\n"${oldPattern}": "${newPattern}";`;
							continue;
						}
					}

					//  Generate types for author pages overriden by a user
					// if (pageOverrideBuffer.lines.length > 0) {
					// 	addLinesToDtsInterface(
					// 		"AstroThemePagesOverrides",
					// 		wrapWithBrackets(pageOverrideBuffer.lines, `"${themeName}": `),
					// 	);
					// }

					// Generate types for injected routes
					// addLinesToDtsInterface(
					// 	"AstroThemePagesInjected",
					// 	wrapWithBrackets(
					// 		Object.entries(pages).map(
					// 			([pattern, entrypoint]) => `"${pattern}": typeof import("${entrypoint}").default;`,
					// 		),
					// 		`"${themeName}": `,
					// 	),
					// );

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
						if (!buffer) continue
						themeTypesBuffer += `
							declare interface ${name} {
								${buffer}
							}
						`
					}

					for (const [name, buffer] of Object.entries(moduleBuffers)) {
						if (!buffer) continue
						themeTypesBuffer += `
							declare module "${name}" {
								${buffer}
							}
						`
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

// export {
// 	GLOB_CSS,
// 	GLOB_API,
// 	GLOB_DATA,
// 	GLOB_ASTRO,
// 	GLOB_IMAGES,
// 	GLOB_MARKDOWN,
// 	GLOB_UI_FRAMEWORK,
// 	GLOB_COMPONENTS,
// 	GLOB_PAGES,
// } from "./utils";

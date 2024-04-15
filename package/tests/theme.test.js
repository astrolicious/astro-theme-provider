import * as assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { afterEach, describe, it, mock } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { watchIntegration } from "astro-integration-kit";
import { z } from "astro/zod";
import _defineTheme from "../dist/index.js";

const thisFile = fileURLToPath(import.meta.url).toString();
const mockDir = resolve(dirname(thisFile), "./mock");
const projectRoot = resolve(mockDir, "project");
const projectSrc = resolve(projectRoot, "src");
const packageRoot = resolve(mockDir, "package");
const packageSrc = resolve(packageRoot, "src");
const packagePages = resolve(packageSrc, "pages");
const packageEntrypoint = resolve(packageRoot, "index.ts");
const packageJSON = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf-8"));
const packageName = packageJSON.name;
const defaultModules = {
	[`${packageName}/config`]: {},
	[`${packageName}/css`]: ["css/styles.css"],
	[`${packageName}/assets`]: ["assets/levi.png"],
	[`${packageName}/layouts`]: ["layouts/Layout.astro"],
	[`${packageName}/components`]: ["components/Heading.astro"],
};

const defineTheme = (option) => {
	return _defineTheme(Object.assign(option, { name: "theme-mock", entrypoint: packageEntrypoint }));
};

const resolveId = (id) => {
	return `\0${id}`;
};

const normalizePath = (path) => {
	return path.replace(/\\+|\/+/g, "/");
};

const astroConfigSetupParamsStub = (params) => ({
	logger: {
		info: mock.fn(),
		warn: mock.fn(),
		error: mock.fn(),
		debug: mock.fn(),
	},
	addWatchFile: mock.fn(),
	command: "dev",
	injectRoute: mock.fn(),
	updateConfig: mock.fn(),
	config: {
		root: pathToFileURL(`${projectRoot}/`),
		srcDir: pathToFileURL(`${projectSrc}/`),
	},
	...(params || {}),
});

describe("defineTheme", () => {
	afterEach(() => {
		mock.reset();
	});

	it("should run", () => {
		assert.doesNotThrow(() => defineTheme({}));
	});

	it("should throw if no src", () => {
		assert.throws(() => defineTheme({ srcDir: "_" }));
	});

	describe("theme integration", () => {
		it("should run", () => {
			assert.doesNotThrow(() => defineTheme({})());
		});

		it("should validate schema", () => {
			assert.throws(() => defineTheme({ schema: z.literal(true) })({ config: false }));
		});

		describe("astro:config:setup", () => {
			it("should run", () => {
				const theme = defineTheme({})();
				const params = astroConfigSetupParamsStub();

				assert.doesNotThrow(() => theme.hooks["astro:config:setup"]?.(params));
			});

			it("should inject pages", () => {
				const theme = defineTheme({})();
				const params = astroConfigSetupParamsStub();
				const entrypoint = normalizePath(resolve(packagePages, "index.astro"));

				theme.hooks["astro:config:setup"]?.(params);

				assert.deepEqual(params.injectRoute.mock.calls[0].arguments[0], {
					entryPoint: entrypoint,
					entrypoint,
					pattern: "/",
				});
			});

			it("should remove pages", () => {
				const theme = defineTheme({})({ pages: { "/": false } });
				const params = astroConfigSetupParamsStub();
				const entrypoint = normalizePath(resolve(packagePages, "index.astro"));

				theme.hooks["astro:config:setup"]?.(params);

				assert.deepEqual(params.injectRoute.mock.calls, []);
			});

			it("should override pages", () => {
				const theme = defineTheme({})({ pages: { "/": "/a" } });
				const params = astroConfigSetupParamsStub();
				const entrypoint = normalizePath(resolve(packagePages, "index.astro"));

				theme.hooks["astro:config:setup"]?.(params);

				assert.deepEqual(params.injectRoute.mock.calls[0].arguments[0], {
					entryPoint: entrypoint,
					entrypoint,
					pattern: "/a",
				});
			});

			it("should resolve virtual modules", () => {
				const theme = defineTheme({})();
				const params = astroConfigSetupParamsStub();

				theme.hooks["astro:config:setup"]?.(params);

				const plugin = params.updateConfig.mock.calls.at(-1).arguments[0].vite.plugins[0];

				for (const moduleName of Object.keys(defaultModules)) {
					assert.equal(plugin.resolveId(moduleName), resolveId(moduleName));
				}
			});

			it("should generate virtual modules", () => {
				const theme = defineTheme({})();
				const params = astroConfigSetupParamsStub();

				theme.hooks["astro:config:setup"]?.(params);

				const plugin = params.updateConfig.mock.calls.at(-1).arguments[0].vite.plugins[0];

				for (const [moduleName, moduleFiles] of Object.entries(defaultModules)) {
					if (!Array.isArray(moduleFiles)) continue;
					const resolved = resolveId(moduleName);
					const content = plugin.load(resolved);
					for (const file of moduleFiles) {
						const testImport = new RegExp(`import \"${normalizePath(resolve(packageSrc, file))}\";`, "g");
						const testExport = new RegExp(`export {.*} from \"${normalizePath(resolve(packageSrc, file))}\";`, "g");
						assert.equal(testImport.test(content) || testExport.test(content), true);
					}
				}
			});

			it("should override virtual modules", () => {
				const overrides = {
					css: ["./styles.css"],
					assets: ["./levi.png"],
					layouts: ["./Layout.astro"],
					components: ["./Heading.astro"],
				};

				const theme = defineTheme({})({ overrides });
				const params = astroConfigSetupParamsStub();

				theme.hooks["astro:config:setup"]?.(params);

				const plugin = params.updateConfig.mock.calls.at(-1).arguments[0].vite.plugins[0];

				for (const [moduleName, moduleFiles] of Object.entries(defaultModules)) {
					if (!Array.isArray(moduleFiles)) continue;
					const resolved = resolveId(moduleName);
					const content = plugin.load(resolved);
					const key = moduleName.split("/").pop();
					for (const file of overrides[key]) {
						const testImport = new RegExp(`import \"${normalizePath(resolve(projectRoot, file))}\";`, "g");
						const testExport = new RegExp(`export {.*} from \"${normalizePath(resolve(projectRoot, file))}\";`, "g");
						assert.equal(testImport.test(content) || testExport.test(content), true);
					}
				}
			});

			it("should generate types", () => {
				const theme = defineTheme({})();
				const params = astroConfigSetupParamsStub();

				theme.hooks["astro:config:setup"]?.(params);

				assert.equal(
					readFileSync(resolve(projectSrc, "env.d.ts"), "utf-8").includes(
						`/// <reference types="../.astro/${packageName}.d.ts" />`,
					),
					true,
				);

				assert.equal(existsSync(resolve(projectRoot, `.astro/${packageName}.d.ts`)), true);
			});
		});
	});
});

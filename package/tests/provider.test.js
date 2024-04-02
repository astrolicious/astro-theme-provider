import * as assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { afterEach, describe, it, mock } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { watchIntegration } from "astro-integration-kit";
import _defineTheme from "../dist/index.js";
import { normalizePath } from "../dist/utils/path.js";

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

const defineTheme = (option) => {
	return _defineTheme(Object.assign(option, { entrypoint: packageEntrypoint }));
};

const resolveId = (id) => {
	return `\0${id}`;
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
		root: pathToFileURL(projectRoot + "/"),
		srcDir: pathToFileURL(projectSrc + "/"),
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

	it("should throw if src doesnt exist", () => {
		assert.throws(() => defineTheme({ srcDir: "_" }));
	});

	describe("execute theme integration", () => {
		it("should run", () => {
			const theme = defineTheme({})();
			const params = astroConfigSetupParamsStub();

			assert.doesNotThrow(() => theme.hooks["astro:config:setup"]?.(params));
		});

		it("should inject pages", () => {
			const theme = defineTheme({})();
			const params = astroConfigSetupParamsStub();

			theme.hooks["astro:config:setup"]?.(params);

			assert.deepEqual(params.injectRoute.mock.calls[0].arguments[0], {
				entryPoint: normalizePath(resolve(packagePages, "index.astro")),
				entrypoint: normalizePath(resolve(packagePages, "index.astro")),
				pattern: "/",
			});
		});

		it("should resolve virtual modules", () => {
			const moduleNames = [
				`${packageName}/css`,
				`${packageName}/config`,
				`${packageName}/assets`,
				`${packageName}/layouts`,
				`${packageName}/components`,
			];
			const theme = defineTheme({})();
			const params = astroConfigSetupParamsStub();

			theme.hooks["astro:config:setup"]?.(params);

			// Vite plugin for resolving virtual modules
			const plugin = params.updateConfig.mock.calls.at(-1).arguments[0].vite.plugins[0];

			for (const moduleName of moduleNames) {
				assert.equal(plugin.resolveId(moduleName), resolveId(moduleName));
			}
		});

		it("should generate types", () => {
			const theme = defineTheme({})();
			const params = astroConfigSetupParamsStub();

			theme.hooks["astro:config:setup"]?.(params);

			// Vite plugin for resolving virtual modules
			const plugin = params.updateConfig.mock.calls.at(-1).arguments[0].vite.plugins[0];

			assert.equal(
				readFileSync(resolve(projectSrc, "env.d.ts"), "utf-8").includes(
					`/// <reference types="../.astro/${packageName}.d.ts" />`,
				),
				true,
			);

			assert.equal(existsSync(resolve(projectRoot, `.astro/${packageName}.d.ts`)), true);
		});
		// /// <reference types="../.astro/theme-mock.d.ts" />
	});
});

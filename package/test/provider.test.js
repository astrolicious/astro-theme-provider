import * as assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { afterEach, describe, it, mock } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { addDts, addIntegration, addVirtualImports, watchIntegration } from "astro-integration-kit/utilities";
import _defineTheme from "../index.js";

const thisFile = fileURLToPath(import.meta.url).toString();
const playgroundDir = resolve(dirname(thisFile), "mock");
const packageRoot = resolve(playgroundDir, "package");
const packageEntrypoint = resolve(packageRoot, "index.ts");
const projectRoot = resolve(playgroundDir, "project");
const projectSrc = resolve(projectRoot, "src");

const defineTheme = (option) => {
	return _defineTheme(Object.assign(option, { entrypoint: packageEntrypoint }));
};

const astroConfigSetupParamsStub = (params) => ({
	logger: {
		fork: mock.fn(),
		info: mock.fn(),
		warn: mock.fn(),
		error: mock.fn(),
		debug: mock.fn(),
	},
	addClientDirective: mock.fn(),
	addDevToolbarApp: mock.fn(),
	addMiddleware: mock.fn(),
	addRenderer: mock.fn(),
	addWatchFile: mock.fn(),
	command: "dev",
	injectRoute: mock.fn(),
	injectScript: mock.fn(),
	isRestart: false,
	updateConfig: mock.fn(),
	addDevOverlayPlugin: mock.fn(),
	config: {
		root: pathToFileURL(projectRoot),
		srcDir: pathToFileURL(projectSrc),
	},
	...(params || {}),
});

describe("defineTheme", () => {
	mock.fn(addDts, () => {});
	mock.fn(addIntegration, () => {});
	mock.fn(addVirtualImports, () => {});
	mock.fn(watchIntegration, () => {});

	afterEach(() => {
		mock.reset();
	});

	it("should run", () => {
		assert.doesNotThrow(() => defineTheme({}));
	});

	describe("execute theme integration", () => {
		it("should run", () => {
			const theme = defineTheme({})();
			const params = astroConfigSetupParamsStub();
			assert.doesNotThrow(() => theme.hooks["astro:config:setup"]?.(params));
		});
	});
});

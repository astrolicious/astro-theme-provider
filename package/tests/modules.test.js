import * as assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { describe, it } from "node:test";
import { resolveModuleObject, toModuleObject } from "../dist/utils/modules.js";

describe("toModuleObject()", () => {
	const imports = ["./global.css"];

	const exports = {
		Layout: "./Layout.astro",
	};

	it("should convert an import array", () => {
		assert.deepEqual(toModuleObject(imports), { imports, exports: {} });
	});

	it("should convert an export object", () => {
		assert.deepEqual(toModuleObject(exports), { imports: [], exports });
	});

	it("should convert an export object with imports", () => {
		assert.deepEqual(toModuleObject({ imports, ...exports }), { imports, exports });
	});

	it("should not change module object", () => {
		const moduleObject = { imports, exports };
		assert.deepEqual(toModuleObject(moduleObject), moduleObject);
	});
});

describe("resolveModuleObject()", () => {
	it("should have absolute root", () => {
		const resolvedModuledObject = resolveModuleObject(import.meta.url, {});

		assert.equal(isAbsolute(resolvedModuledObject.root), true);
	});

	it("should have absolute imports", () => {
		const resolvedModuledObject = resolveModuleObject(import.meta.url, { imports: ["./global.css"] });

		assert.equal(resolvedModuledObject.imports.every(isAbsolute), true);
	});

	it("should have absolute exports", () => {
		const resolvedModuledObject = resolveModuleObject(import.meta.url, {
			exports: {
				default: "./Layout.astro",
			},
		});

		assert.equal(Object.values(resolvedModuledObject.exports).every(isAbsolute), true);
	});

	it("should not have absolute imports", () => {
		const resolvedModuledObject = resolveModuleObject(import.meta.url, { imports: ["package"] });

		assert.equal(resolvedModuledObject.imports.every(isAbsolute), false);
	});

	it("should not have absolute exports", () => {
		const resolvedModuledObject = resolveModuleObject(import.meta.url, {
			exports: {
				default: "package",
			},
		});

		assert.equal(Object.values(resolvedModuledObject.exports).every(isAbsolute), false);
	});
});

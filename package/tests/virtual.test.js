import * as assert from "node:assert/strict";
import { isAbsolute } from "node:path";
import { describe, it } from "node:test";
import { resolveModuleObject } from "../dist/utils/virtual.js";

const moduleObject = {
	imports: ["./styles.css"],
	exports: {
		default: "../../Layout.astro",
	},
};

describe("resolveModuleObject()", () => {
	const resolvedModuledObject = resolveModuleObject(import.meta.url, moduleObject);

	it("root is absolute", () => {
		assert.equal(isAbsolute(resolvedModuledObject.root), true);
	});

	it("imports are absolute", () => {
		assert.equal(resolvedModuledObject.imports.every(isAbsolute), true);
	});

	it("exports are absolute", () => {
		assert.equal(Object.values(resolvedModuledObject.exports).every(isAbsolute), true);
	});
});

import { isAbsolute } from "node:path";
import { describe, expect, test } from "vitest";
import { resolveModuleObject } from "../../src/utils/virtual.ts";

const moduleObject = {
	imports: ["./styles.css"],
	exports: {
		default: "../../Layout.astro",
	},
};

describe("resolveModuleObject()", () => {
	const resolvedModuledObject = resolveModuleObject(import.meta.url, moduleObject);

	test("root is absolute", () => {
		expect(isAbsolute(resolvedModuledObject.root)).toBe(true);
	});

	test("imports are absolute", () => {
		expect(resolvedModuledObject.imports.every(isAbsolute)).toBe(true);
	});

	test("exports are absolute", () => {
		expect(Object.values(resolvedModuledObject.exports).every(isAbsolute)).toBe(true);
	});
});

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { HookParameters } from "astro";
import { AstroError } from "astro/errors";
import type { PackageJSONOptions } from "../types";
import { stringToDirectory, stringToFilepath } from "./path";

export class PackageJSON {
	path: string;
	json!: PackageJSONOptions;

	constructor(path: string) {
		if (path.endsWith("package.json")) {
			this.path = stringToFilepath("./", path);
		} else {
			this.path = stringToFilepath(path, "package.json");
		}
		this.read();
	}

	read() {
		try {
			this.json = JSON.parse(readFileSync(this.path, "utf-8"));
		} catch (error) {
			throw new AstroError(`Could not read "package.json"`, this.path);
		}
		return this;
	}

	// write() {
	//   writeFileSync(this.entrypoint, this.toString(), 'utf-8')
	// }

	toString() {
		return JSON.stringify(this.json);
	}
}

export function warnThemePackage(pkg: PackageJSON, logger: HookParameters<"astro:config:setup">["logger"]) {
	const { json } = pkg;

	// If package is not private, warn theme author about issues with package
	if (!json.private) {
		// Warn theme author if `astro-integration` keyword does not exist inside 'package.json'
		if (!json?.keywords?.includes("astro-integration")) {
			logger.warn(
				`Add the 'astro-integration' keyword to your theme's 'package.json'!\tAstro uses this value to support the command 'astro add ${pkg.json.name}'\n\n\t"keywords": [ "astro-integration" ],\n`,
			);
		}

		// Warn theme author if no 'description' property exists inside 'package.json'
		if (!json?.description) {
			logger.warn(
				`Add a 'description' to your theme's 'package.json'!\tAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"description": "My awesome Astro theme!",\n`,
			);
		}

		// Warn theme author if no 'homepage' property exists inside 'package.json'
		if (!json?.homepage) {
			logger.warn(
				`Add a 'homepage' to your theme's 'package.json'!\tAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"homepage": "https://github.com/UserName/my-theme",\n`,
			);
		}

		// Warn theme author if no 'repository' property exists inside 'package.json'
		if (!json?.repository) {
			logger.warn(
				`Add a 'repository' to your theme's 'package.json'!\tAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"repository": ${JSON.stringify(
					{
						type: "git",
						url: `https://github.com/UserName/${pkg.json.name}`,
						directory: "package",
					},
					null,
					4,
				).replace(/\n/g, "\n\t")},\n`,
			);
		}

		// Warn theme author if package does not have a README
		if (!existsSync(stringToFilepath(pkg.path, "README.md"))) {
			logger.warn(
				`Add a 'README.md' to the root of your theme's package!\tNPM uses this file to populate the package page https://www.npmjs.com/package/${pkg.json.name}\n`,
			);
		}
	}
}

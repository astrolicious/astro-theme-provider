import { existsSync, readFileSync } from "node:fs";
import type { HookParameters } from "astro";
import { AstroError } from "astro/errors";
import type { PackageJSONOptions } from "../internal/types.js";
import { resolveFilepath } from "./path.js";

export class PackageJSON {
	path: string;
	json!: PackageJSONOptions;

	constructor(path: string) {
		if (path.endsWith("package.json")) {
			this.path = resolveFilepath("./", path);
		} else {
			this.path = resolveFilepath(path, "package.json");
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
	const { name, private: isPrivate, keywords = [], description, homepage, repository } = pkg.json;

	// If package is not private, warn theme author about issues with package
	if (!isPrivate) {
		let hasIssues = false;
		const warn = (condition: boolean, message: string) => {
			if (condition) {
				hasIssues = true;
				if (message.includes("\\n")) for (const m of `${message}\n`.split("\\n")) logger.warn(m);
				else logger.warn(`${message}\n`);
			}
		};

		// Warn theme author if `astro-integration` keyword does not exist inside 'package.json'
		warn(
			!keywords.includes("astro-integration"),
			`Add the 'astro-integration' keyword to your theme's 'package.json'!\\nAstro uses this value to support the command 'astro add ${name}'\n\n\t"keywords": [ "astro-integration" ]`,
		);

		// Warn theme author if no 'description' property exists inside 'package.json'
		warn(
			!description,
			`Add a 'description' to your theme's 'package.json'!\\nAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"description": "My awesome Astro theme!"`,
		);

		// Warn theme author if no 'homepage' property exists inside 'package.json'
		warn(
			!homepage,
			`Add a 'homepage' to your theme's 'package.json'!\\nAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"homepage": "https://github.com/UserName/theme-playground"`,
		);

		// Warn theme author if no 'repository' property exists inside 'package.json'
		warn(
			!repository,
			`Add a 'repository' to your theme's 'package.json'!\\nAstro uses this value to populate the integrations page https://astro.build/integrations/\n\n\t"repository": ${JSON.stringify(
				{
					type: "git",
					url: `https://github.com/UserName/${name}`,
					directory: "package",
				},
				null,
				4,
			).replaceAll("\n", "\n\t")}`,
		);

		// Warn theme author if package does not have a README
		warn(
			!existsSync(resolveFilepath(pkg.path, "README.md", false)),
			`Add a 'README.md' to the root of your theme's package!\\nNPM uses this file to populate the package page https://www.npmjs.com/package/${name} `,
		);

		if (hasIssues) {
			logger.warn(
				"These warnings in order to notice for people who are preparing to submit theme to the Astro integration page, ",
			);
			logger.warn(
				"If you don't want to submit your theme, you can set `'private': true` inside the `package.json` to suppress these warnings.",
			);
		}
	}
}

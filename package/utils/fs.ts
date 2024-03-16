import { existsSync, mkdirSync } from "node:fs";
import { AstroError } from "astro/errors";
import { stringToDirectory } from "./path";

export function tryToCreateDirectory(path: string) {
	const dir = stringToDirectory("./", path, false);
	try {
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
	} catch {
		throw new AstroError(`Failed to create directory`, dir);
	}
}

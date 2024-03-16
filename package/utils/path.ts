import { existsSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AstroError } from "astro/errors";

export function removeLeadingSlash(path: string) {
	return path.replace(/\/+$/, "");
}

export function addLeadingSlash(path: string) {
	return `/${removeLeadingSlash(path)}`;
}

export function removeTrailingSlash(path: string) {
	return path.replace(/^\/+/, "");
}

export function addTailingSlash(path: string) {
	return `${removeTrailingSlash(path)}/`;
}

export function removeLeadingAndTrailingSlashes(path: string) {
	return removeTrailingSlash(removeLeadingSlash(path));
}

export function addLeadingAndTrailingSlashes(path: string) {
	return `/${removeLeadingAndTrailingSlashes(path)}/`;
}

export function normalizePath(path: string) {
	return path.replace(/\\+|\/+/g, "/");
}

export function normalizePattern(pattern: string) {
	return removeLeadingAndTrailingSlashes(pattern)
		.split("/")
		.map((slug) => (slug.startsWith("[") ? slug : "/"))
		.join("");
}

export function validatePattern(newPattern: string, oldPattern: string) {
	return normalizePattern(newPattern) === normalizePattern(oldPattern);
}

export function stringToDirectory(base: string, path: string, safe = true): string {
	if (path.startsWith("file:/")) {
		path = fileURLToPath(path);
	}

	if (!isAbsolute(path)) {
		path = resolve(base, path);
	}

	if (extname(path)) {
		path = dirname(path);
	}

	if (safe && !existsSync(path)) {
		throw new AstroError(`Directory does not exist!`, `"${path}"`);
	}

	return path;
}

export function stringToFilepath(base: string, path: string, safe = true): string {
	if (path.startsWith("file:/")) {
		path = fileURLToPath(path);
	}

	if (!isAbsolute(path)) {
		path = resolve(stringToDirectory("./", base), path);
	}

	if (safe) {
		if (!extname(path)) {
			throw new AstroError(`Filepath is a directory!`, `"${path}"`);
		}

		if (!existsSync(path)) {
			throw new AstroError(`File does not exist!`, `"${path}"`);
		}
	}

	return path;
}

// export function createResolver(base?: string | undefined | null) {
// 	if (!base) {
// 		throw new AstroError(`'base' path for 'createResolver()' is invalid!`, `${base}`);
// 	}

// 	if (base.startsWith("file:/")) {
// 		base = fileURLToPath(base);
// 	}

// 	if (extname(base)) {
// 		base = dirname(base);
// 	}

// 	if (!toAbsolute(base)) {
// 		throw new AstroError(`'base' path cannot be a relative path!`, base);
// 	}

// 	if (!existsSync(base)) {
// 		throw new AstroError(`'base' path does not exist!`, base);
// 	}

// 	function toAbsolute(path: string | undefined | null = "./") {
// 		if (!path) {
// 			return null;
// 		}

// 		// Check if path is a file URL
// 		if (path.startsWith("file:/")) {
// 			path = fileURLToPath(path);
// 		}

// 		// Check if path is relative
// 		if (!isAbsolute(path)) {
// 			path = resolve(base!, path);
// 		}

// 		return path;
// 	}

// 	function toAbsoluteDir(path?: string | undefined | null) {
// 		path = toAbsolute(path);

// 		if (path && extname(path)) {
// 			path = dirname(path);
// 		}

// 		return path;
// 	}

// 	function toAbsoluteFile(path?: string | undefined | null) {
// 		path = toAbsolute(path);

// 		if (path && !extname(path)) {
// 			return null;
// 		}

// 		return path;
// 	}

// 	function toAbsoluteDirSafe(path?: string | undefined | null) {
// 		const file = toAbsoluteDir(path);
// 		if (!file) {
// 			throw new AstroError(`Invalid directory path!`, path || "");
// 		}
// 		if (!existsSync(file)) {
// 			throw new AstroError(`File does not exist!`, file);
// 		}
// 		return file;
// 	}

// 	function toAbsoluteFileSafe(path?: string | undefined | null) {
// 		const dir = toAbsoluteFile(path);
// 		if (!dir) {
// 			throw new AstroError(`Invalid directory path!`, path || "");
// 		}
// 		if (!existsSync(dir)) {
// 			throw new AstroError(`Directory does not exist!`, dir);
// 		}
// 		return dir;
// 	}

// 	return {
// 		base,
// 		toAbsolute,
// 		toAbsoluteDir,
// 		toAbsoluteFile,
// 		toAbsoluteDirSafe,
// 		toAbsoluteFileSafe,
// 	};
// }

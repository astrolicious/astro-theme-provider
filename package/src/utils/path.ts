import { existsSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AstroError } from "astro/errors";
import { CSS_FORMATS, IMAGE_FORMATS } from "../internal/consts.js";

export function isImageFile(path: string): boolean {
	return IMAGE_FORMATS.includes(extname(path).slice(1).toLowerCase());
}

export function isCSSFile(path: string): boolean {
	return CSS_FORMATS.includes(extname(path).slice(1).toLowerCase());
}

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
		.map((slug) => (slug.includes("[") ? slug : "/"))
		.join("");
}

export function validatePattern(newPattern: string, oldPattern: string) {
	return normalizePattern(newPattern) === normalizePattern(oldPattern);
}

export function resolveDirectory(base: string, path: string, safe = true): string {
	if (path.startsWith("file:/")) {
		path = fileURLToPath(path);
	}

	if (!isAbsolute(path)) {
		path = resolve(resolveDirectory("./", base), path);
	}

	if (extname(path)) {
		path = dirname(path);
	}

	if (safe && !existsSync(path)) {
		throw new AstroError(`Directory does not exist!`, `"${path}"`);
	}

	return path;
}

export function resolveFilepath(base: string, path: string, safe = true): string {
	if (path.startsWith("file:/")) {
		path = fileURLToPath(path);
	}

	if (!isAbsolute(path)) {
		path = resolve(resolveDirectory("./", base), path);
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

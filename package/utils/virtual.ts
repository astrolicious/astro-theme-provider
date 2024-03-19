import { basename, extname, resolve } from "node:path";
import fg from "fast-glob";
import { GLOB_IGNORE } from "./consts.ts";
import { mergeOptions } from "./options.ts";
import { isCSSFile, isImageFile, normalizePath } from "./path.ts";

export type ImportOption = string | false | null | undefined;

export type ModuleImports = (ImportOption | ModuleImports)[];

export interface ModuleExports {
	[name: string]: ImportOption;
}

export type ResolvedModuleImports = string[];

export interface ResolvedModuleExports {
	[name: string]: string;
}

export interface ModuleObject {
	imports?: ModuleImports;
	exports?: ModuleExports;
}

export interface ResolvedModuleObject extends ModuleObject {
	resolved: true;
	imports: ResolvedModuleImports;
	exports: ResolvedModuleExports;
}

export interface VirtualModule extends ResolvedModuleObject {
	name: string;
	content: string;
}

function camelCase(str: string) {
	return str.replace(/(-|<|>|:|"|\/|\\|\||\?|\*|\s)./g, (x) => x[1]!.toUpperCase());
}

function shouldBeNamespaceImport(path: string) {
	return isCSSFile(path);
}

function resolveId(id: string, base = "./") {
	return normalizePath(id.startsWith(".") ? resolve(base, id) : id);
}

function resolveImportArray(imports: ModuleImports, store?: Set<string>): ResolvedModuleImports {
	store ||= new Set<string>();

	if (imports) {
		for (const i of imports) {
			if (!i) continue;
			if (Array.isArray(i)) {
				resolveImportArray(i, store);
				continue;
			}
			store.add(resolveId(i));
		}
	}

	return Array.from(store);
}

export function isEmptyModuleObject(option: ModuleImports | ModuleExports | ModuleObject | VirtualModule): boolean {
	if (Array.isArray(option)) {
		option = { imports: option, exports: {} };
	}

	const { imports = [], exports = option } = option;

	return (!imports || !!imports.length) && (!exports || !!Object.keys(exports).length);
}

export function resolveExportObject(exports: ModuleExports): ResolvedModuleExports {
	const resolved: ResolvedModuleExports = {};

	for (const [name, path] of Object.entries(exports)) {
		if (!path) continue;
		resolved[camelCase(name)] = resolveId(path);
	}

	return resolved;
}

export function resolveModuleObject(module: ModuleObject): ResolvedModuleObject {
	const { imports = [], exports = {} } = module;
	return {
		resolved: true,
		imports: resolveImportArray(imports),
		exports: resolveExportObject(exports),
	};
}

export function convertToModuleObject(option: ModuleImports | ModuleExports | ModuleObject): ModuleObject {
	if (Array.isArray(option)) {
		option = { imports: option, exports: {} };
	}

	const { imports = [], exports = option as ModuleExports } = option as ModuleObject;

	return { imports, exports };
}

export function globToModuleObject(cwd: string, glob: string | string[]): ModuleObject {
	const files = fg.sync([glob, GLOB_IGNORE].flat(), { cwd, absolute: true });

	const exports: ModuleExports = {};
	const imports: ModuleImports = [];

	for (const file of files.reverse()) {
		if (shouldBeNamespaceImport(file)) {
			imports.push(file);
			continue;
		}
		const name = basename(file).slice(0, -extname(file).length);
		exports[name] = file;
	}

	return {
		imports,
		exports,
	};
}

export function createVirtualModule(name: string, module: ModuleObject): VirtualModule {
	const resolved = resolveModuleObject(module);
	return {
		name,
		content: getModuleContent(resolved),
		...resolved,
	};
}

export function mergeIntoModuleObject<T extends S, S extends ModuleObject | ResolvedModuleObject | VirtualModule>(
	target: T,
	source: S,
): T {
	if (!(source as ResolvedModuleObject)?.resolved) {
		source = resolveModuleObject(source) as S;
	}

	target = mergeOptions(target, source) as T;

	if ("content" in target) {
		target.content = getModuleContent(target);
	}

	return target;
}

export function getModuleContent({ imports, exports }: ResolvedModuleObject | VirtualModule) {
	return `${getModuleImportsContent(imports)}\n${getModuleExportsContent(exports)}`;
}

export function getModuleImportsContent(imports: ResolvedModuleImports) {
	let buffer = "";

	for (const path of imports) {
		buffer += `\nimport ${JSON.stringify(path)};`;
	}

	return buffer;
}

export function getModuleExportsContent(exports: ResolvedModuleExports) {
	let buffer = "";

	for (const [name, path] of Object.entries(exports || {})) {
		if (!path || shouldBeNamespaceImport(path)) continue;

		buffer += `\nexport { default as ${name} } from ${JSON.stringify(path)};`;
	}

	return buffer;
}

export function getModuleObjectTypes(
	module: ResolvedModuleObject | VirtualModule,
	create: ({ name, path, type }: { name: string; path: string; type: string }) => string,
) {
	let buffer = "";

	const { exports } = module;

	for (const [name, path] of Object.entries(exports || {})) {
		if (!path || shouldBeNamespaceImport(path)) continue;

		let type;

		if (isImageFile(path)) {
			type = `import("astro").ImageMetadata;`;
		} else {
			type = `typeof import(${JSON.stringify(path)}).default;`;
		}

		const line = create({ name, path, type });

		buffer += line;
	}

	return buffer;
}

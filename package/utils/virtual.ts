import { basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import { CSS_FORMATS, GLOB_IGNORE, IMAGE_FORMATS } from "./consts.ts";

// const resolveUserId = (id: string, base = "./") => (id.startsWith(".") ? resolve(srcDir, id) : id);

type ModuleImports = (ModuleImports | string | false | null | undefined)[];

interface ModuleExports {
	[name: string]: string | false | null | undefined;
}

type ResolvedModuleImports = string[];

interface ResolvedModuleExports {
	[name: string]: string;
}

interface ModuleObject {
	imports?: ModuleImports;
	exports?: ModuleExports;
}

interface ResolvedModuleObject {
	imports: ResolvedModuleImports;
	exports: ResolvedModuleExports;
}

interface VirtualModule {
	name: string;
	imports: ResolvedModuleImports;
	exports: ResolvedModuleExports;
	content: string;
}

function camelCase(str: string) {
	return str.replace(/(-|<|>|:|"|\/|\\|\||\?|\*|\s)./g, (x) => x[1]!.toUpperCase());
}

function isImageFile(path: string): boolean {
	return IMAGE_FORMATS.includes(extname(path).slice(1).toLowerCase());
}

function isCSSFile(path: string): boolean {
	return CSS_FORMATS.includes(extname(path).slice(1).toLowerCase());
}

function shouldBeNamespaceImport(path: string) {
	return isCSSFile(path);
}

function resolveId(id: string, base = "./") {
	return id.startsWith(".") ? resolve(base, id) : id;
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

export function resolveExportObject(exports: ModuleExports): ResolvedModuleExports {
	const resolved: ResolvedModuleExports = {};

	for (const [name, path] of Object.entries(exports)) {
		if (!path) continue;
		resolved[camelCase(name)] = resolveId(path);
	}

	return resolved;
}

export function globToModuleObject(cwd: string, glob: string | string[]): ModuleObject {
	const files = fg.sync([glob, GLOB_IGNORE].flat(), { cwd, absolute: true });

	const exports: ModuleExports = {};
	const imports: ModuleImports = [];

	for (const file of files.reverse()) {
		if (shouldBeNamespaceImport(file)) {
			imports.push(file)
			continue
		}
		const name = basename(file).slice(0, -extname(file).length);
		exports[name] = file;
	}

	return {
		imports,
		exports
	};
}

export function virtualModuleObject(name: string, { imports = [], exports = {} }: ModuleObject): VirtualModule {
	const resolvedExports = resolveExportObject(exports);
	const resolvedImports = resolveImportArray(imports);

	return {
		name,
		imports: resolvedImports,
		exports: resolvedExports,
		content: getModuleContent(resolvedImports, resolvedExports),
	};
}

export function getModuleContent(imports: ResolvedModuleImports, exports: ResolvedModuleExports) {
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

export function getVirtualModuleTypes(
	module: VirtualModule,
	create: ({ name, path, type }: { name: string; path: string, type: string }) => string,
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

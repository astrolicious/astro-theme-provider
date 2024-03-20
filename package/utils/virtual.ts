import { basename, extname, resolve } from "node:path";
import fg from "fast-glob";
import { GLOB_IGNORE } from "./consts.ts";
import { mergeOptions } from "./options.ts";
import { isCSSFile, isImageFile, normalizePath } from "./path.ts";

const RESOLVED = Symbol("resolved");

export type ImportOption = string | false | null | undefined;

export type ModuleImports = (ImportOption | ModuleImports)[];

export type ResolvedModuleImports = string[];

export interface ModuleExports {
	[id: string]: ImportOption;
}

export interface ResolvedModuleExports {
	[id: string]: string;
}

export interface ModuleObject {
	imports?: ModuleImports;
	exports?: ModuleExports;
}

export interface ResolvedModuleObject extends ModuleObject {
	root: string;
	imports: ResolvedModuleImports;
	exports: ResolvedModuleExports;
	[RESOLVED]: true;
}

export interface VirtualModule extends ResolvedModuleObject {
	name: string;
	merge: (source: ResolvedModuleObject | VirtualModule) => void;
	content: (content?: string) => string;
	types: {
		module: () => string;
		interface: () => string;
	};
}

export function camelCase(str: string) {
	return str.replace(/(-|<|>|:|"|\/|\\|\||\?|\*|\s)./g, (x) => x[1]!.toUpperCase());
}

export function resolveId(root: string, id: string) {
	return normalizePath(id.startsWith(".") ? resolve(root || "./", id) : id);
}

export function isSideEffectImport(path: string) {
	return isCSSFile(path);
}

export function isEmptyModuleObject({
	imports = [],
	exports = {},
}: ModuleObject | ResolvedModuleObject | VirtualModule): boolean {
	return !!imports?.length && !!Object.keys(exports || {}).length;
}

export function mergeModuleObjects<T extends S, S extends ModuleObject | ResolvedModuleObject | VirtualModule>(
	target: T,
	{ imports = [], exports = {} }: S,
): T {
	return mergeOptions(target, { imports, exports }) as T;
}

export function toModuleObject(option: ModuleImports | ModuleExports | ModuleObject): ModuleObject {
	if (Array.isArray(option)) {
		option = { imports: option, exports: {} };
	}

	const { imports = [], exports = option as ModuleExports } = option as ModuleObject;

	return { imports, exports };
}

export function resolveImportArray(root: string, imports: ModuleImports, store?: Set<string>): ResolvedModuleImports {
	store ||= new Set<string>();

	for (const i of imports) {
		if (!i) continue;
		if (Array.isArray(i)) {
			resolveImportArray(root, i, store);
			continue;
		}
		store.add(resolveId(root, i));
	}

	return Array.from(store);
}

export function resolveExportObject(root: string, exports: ModuleExports): ResolvedModuleExports {
	const resolved: ResolvedModuleExports = {};
	for (const name in exports) {
		const id = exports[name];
		if (!id) continue;
		resolved[camelCase(name)] = resolveId(root, id);
	}
	return resolved;
}

export function resolveModuleObject(
	root: string,
	module: ModuleObject | ResolvedModuleObject | VirtualModule,
): ResolvedModuleObject {
	if (RESOLVED in module) return module;
	const { imports = [], exports = {} } = module;
	return {
		root,
		imports: resolveImportArray(root, imports),
		exports: resolveExportObject(root, exports),
		[RESOLVED]: true,
	};
}

export function globToModuleObject(root: string, glob: string | string[]): ResolvedModuleObject {
	const files = fg.sync([glob, GLOB_IGNORE].flat(), { cwd: root, absolute: true });

	const imports: ResolvedModuleImports = [];
	const exports: ResolvedModuleExports = {};

	for (const file of files.reverse()) {
		if (isSideEffectImport(file)) {
			imports.push(file);
			continue;
		}
		const name = basename(file).slice(0, -extname(file).length);
		exports[name] = file;
	}

	return {
		root,
		imports,
		exports,
		[RESOLVED]: true,
	};
}

export function createVirtualModule(
	name: string,
	root: string,
	module: ModuleObject | ResolvedModuleObject,
): VirtualModule {
	const resolved = resolveModuleObject(root, module);

	const virtual: VirtualModule = {
		name,
		...resolved,
		merge: (source) => mergeModuleObjects(virtual, source),
		content: (content) => generateModuleContent(virtual, content),
		types: {
			module: () => generateModuleTypes(virtual),
			interface: () => generateInterfaceTypes(virtual),
		},
	};

	return virtual;
}

export function generateModuleContent({ imports, exports }: ResolvedModuleObject | VirtualModule, content = "") {
	return `${generateModuleImportContent(imports)}\n${content}\n${generateModuleExportContent(exports)}`;
}

export function generateModuleImportContent(imports: ResolvedModuleImports) {
	let buffer = "";

	for (const path of imports) {
		buffer += `\nimport ${JSON.stringify(path)};`;
	}

	return buffer;
}

export function generateModuleExportContent(exports: ResolvedModuleExports) {
	let buffer = "";

	for (const [name, path] of Object.entries(exports || {})) {
		if (!path || isSideEffectImport(path)) continue;

		if (name === "default") {
			buffer += `export default ${JSON.stringify(path)}`;
			continue;
		}

		buffer += `\nexport { default as ${name} } from ${JSON.stringify(path)};`;
	}

	return buffer;
}

export function generateInterfaceTypes(option: Parameters<typeof generateTypesFromModule>[0]) {
	return generateTypesFromModule(option, ({ name, type }) => `\n${name}: ${type};`);
}

export function generateModuleTypes(option: Parameters<typeof generateTypesFromModule>[0]) {
	return generateTypesFromModule(option, ({ name, type }) =>
		name === "default" ? `\nconst _default: ${type};\nexport default _default;` : `\nexport const ${name}: ${type};`,
	);
}

export function generateTypesFromModule(
	module: ResolvedModuleObject | VirtualModule,
	generate: ({ name, path, type }: { name: string; path: string; type: string }) => string,
) {
	let buffer = "";

	const { exports } = module;

	for (const [name, path] of Object.entries(exports || {})) {
		if (!path || isSideEffectImport(path)) continue;

		let type;

		if (isImageFile(path)) {
			type = `import("astro").ImageMetadata`;
		} else {
			type = `typeof import(${JSON.stringify(path)}).default`;
		}

		const line = generate({ name, path, type });

		buffer += line;
	}

	return buffer;
}

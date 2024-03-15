import { resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import { CSS_FORMATS, GLOB_IGNORE, IMAGE_FORMATS } from './consts';

// const resolveUserId = (id: string, base = "./") => (id.startsWith(".") ? resolve(srcDir, id) : id);

type ModuleImports = (ModuleImports | string | false | null | undefined)[]

interface ModuleExports {
  [name: string]: string | false | null | undefined;
}

type ResolvedModuleImports = string[]

interface ResolvedModuleExports {
  [name: string]: string;
}

interface ModuleObject {
  name: string;
  imports: ModuleImports
  exports: ModuleExports
}

interface ResolvedModuleObject {
  name: string;
  imports: ResolvedModuleImports
  exports: ResolvedModuleExports
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

function shouldBeNamespaceImport (path: string) {
  return isCSSFile(path)
}

function resolveId (id: string, base = "./") {
  return JSON.stringify(id.startsWith(".") ? resolve(base, id) : id);
}

function resolveImportArray(imports: ModuleImports): ResolvedModuleImports {
  const store = new Set<string>()
  if (imports) {
    for (const i of imports) {
      if (!i) continue
      if (Array.isArray(i)) {
        resolveImportArray(i)
        continue
      }
      store.add(resolveId(i))
    }
  }
  return Array.from(store)
}

function resolveExportObject(exports: ModuleExports): ResolvedModuleExports {
  const resolved: ResolvedModuleExports = {}

  for (const [name, path] of Object.entries(exports)) {
    if (!path || shouldBeNamespaceImport(path)) continue
    resolved[camelCase(name)] = resolveId(path)
  }

  return resolved
}

export function globToVirtualModule(name: string, cwd: string, glob: string | string[]): ModuleObject {
	const files = fg.sync([glob, GLOB_IGNORE].flat(), { cwd, absolute: true });
  
	const exports: ModuleExports = {};
  const imports: ModuleImports = []

	for (const file of files.reverse()) {
		const name = basename(file).slice(0, -extname(file).length);
		exports[name] = file;
	}

	return {
    name,
    imports,
    exports
  };
}

export function resolveModuleObject({
  name,
  imports,
  exports
} : ModuleObject): ResolvedModuleObject {
  const resolvedImports = resolveImportArray(imports)
  const resolvedExports = resolveExportObject(exports)
  const content = `${resolvedImports.join(';\n')};\n`

  return {
    name,
    imports: resolvedImports,
    exports: resolvedExports,
    content
  }
}

export function getModuleObjectTypes(moduleName: string, module: ModuleObject) {
  let buffer = ""

  const { exports } = module

  for (const [name, path] of Object.entries(exports)) {
    if (!path || shouldBeNamespaceImport(path)) continue

    if (isImageFile(path)) {
      buffer += `\n${camelCase(name)}: import("astro").ImageMetadata;`
      continue
    };

    buffer += `\n${camelCase(name)}: typeof import(${resolveId(path, moduleName)}).default;`;
  }

  return buffer
}
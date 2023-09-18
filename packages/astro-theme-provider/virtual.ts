import type { AstroConfig, ViteUserConfig } from 'astro'
import type { ExportTypes, AuthorConfigTypes, ValidatedConfigTypes } from './types'
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveVirtualModuleId<T extends string>(id: T): `\0${T}` {
	return `\0${id}`;
}

export function vitePluginThemeProvider<AuthorConfig, AuthorExports extends ExportTypes>(
	authorOptions: AuthorConfigTypes<AuthorConfig, AuthorExports>,
	userOptions: ValidatedConfigTypes<AuthorConfig>,
	context: AstroConfig
): NonNullable<ViteUserConfig['plugins']>[number] {
	
	const resolveId = (id: string) =>
		JSON.stringify(id.startsWith('.') ? resolve(fileURLToPath(context.root), id) : id);

	const exportDefaultsAs = (obj: Record<string, string>) => 
		Object.entries(obj)
			.map(([name, path]) => `export { default as ${name} } from ${resolveId(path)};`)
			.join('')

	const modules: Record<string, string> = {}

	modules[`virtual:${authorOptions.name}/context`] = `export default ${JSON.stringify(context)}`,
  modules[`virtual:${authorOptions.name}/config`] = `export default ${JSON.stringify(userOptions.config)}`,
  modules[`virtual:${authorOptions.name}/css`] = userOptions.exports.css.map((id) => `import ${resolveId(id)};`).join('')

	// If exports are not defined, virtual modules are empty, what is the best way to handle this?
	modules[`virtual:${authorOptions.name}/components`] = exportDefaultsAs(userOptions.exports.components)
	modules[`virtual:${authorOptions.name}/assets`] = exportDefaultsAs(userOptions.exports.assets)

	const resolutionMap = Object.fromEntries(
		(Object.keys(modules) as (keyof typeof modules)[]).map((key) => [
			resolveVirtualModuleId(key),
			key,
		])
	);

	return {
		name: 'vite-plugin-theme-provider',
		resolveId(id): string | void {
			if (id in modules) return resolveVirtualModuleId(id);
		},
		load(id): string | void {
			const resolution = resolutionMap[id];
			if (resolution) return modules[resolution];
		},
	};
}
import { AstroError } from "astro/errors";
import type { Plugin } from "vite";

type MightBeAString = string | false | null | undefined;

interface Params {
	ssr: boolean | undefined;
	importer: string | undefined;
}

const resolveId = (id: string): string => {
	return `\0${id}`;
};

export function createVirtualResolver({
	name,
	imports,
}: {
	name: string;
	imports: Record<string, ((option: Params) => MightBeAString) | MightBeAString>;
}): Plugin {
	const staticIds = new Map<string, MightBeAString>();
	const dynamicIds = new Map<string, (option: Params) => MightBeAString>();
	for (const [id, option] of Object.entries(imports)) {
		if (id.startsWith("astro:")) {
			throw new AstroError(`Cannot create virtual import "${id}", the  prefix "astro:" is reserved for Astro core.`);
		}
		if (typeof option === "string") {
			staticIds.set(resolveId(id), option);
		}
		if (typeof option === "function") {
			dynamicIds.set(resolveId(id), option);
		}
	}
	return {
		name: `${name}-virtual-resolver`,
		resolveId(id, importer) {
			if (id in imports === false) return null;
			const resolvedId = resolveId(id);
			if (staticIds.has(resolvedId)) return resolvedId;
			if (dynamicIds.has(resolvedId)) {
				const params = new URLSearchParams();
				if (importer) params.set("importer", importer);
				return `${resolvedId}?${params.toString()}&x`;
			}
			return null;
		},
		load(id, { ssr } = {}) {
			if (!id.startsWith("\0")) return null;
			const [resolvedId, rawParams] = id.split("?", 2);
			if (!resolvedId) return null;
			const staticOption = staticIds.get(resolvedId);
			if (staticOption) return staticOption;
			const dynamicOption = dynamicIds.get(resolvedId);
			if (dynamicOption) {
				const params = new URLSearchParams(rawParams);
				const importer = params.get("importer") || undefined;
				const option = { ssr, importer };
				const value = dynamicOption.call(this, option) || null;
				return value;
			}
			return null;
		},
	};
}

import type { Option as PageDirOption } from "astro-pages/types";
import type { Option as StaticDirOption } from "astro-public/types";
import type { z } from "astro/zod";
import type { ModuleExports, ModuleImports, ModuleObject } from "./utils/virtual";

export type ValueOrArray<T> = T | ValueOrArray<T>[];

export type NestedStringArray = ValueOrArray<string>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export interface PackageJSONOptions {
	private?: boolean;
	name?: string;
	description?: string;
	keywords?: string[];
	homepage?: string;
	repository?:
		| string
		| {
				type: string;
				url: string;
				directory?: string;
		  };
}

export type AuthorOptions<Config extends z.ZodTypeAny> = Prettify<{
	name?: ThemeName;
	entrypoint?: string;
	srcDir?: string;
	publicDir?: string | StaticDirOption;
	pageDir?: string | PageDirOption;
	schema?: z.infer<Config>;
	modules?: Record<string, string | ModuleImports | ModuleExports | ModuleObject>;
}>;

export type UserOptions<Config extends z.ZodTypeAny> = Prettify<{
	config: Config;
	pages?: AstroThemePagesOverridesOptions<ThemeName> | undefined;
	overrides?: AstroThemeModulesOptions<ThemeName> | undefined;
}>;

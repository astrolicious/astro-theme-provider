import type { Option as PageDirOption } from "astro-pages/types";
import type { Option as StaticDirOption } from "astro-public/types";
import type { z } from "astro/zod";

export type ValueOrArray<T> = T | ValueOrArray<T>[];

export type NestedStringArray = ValueOrArray<string>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type ModuleOptions = Record<string, undefined | null | false | string | string[] | Record<string, string>>;

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

export type AuthorOptions<Config extends Record<string, unknown>> = Prettify<{
	name?: ThemeName;
	entrypoint?: string;
	srcDir?: string;
	publicDir?: string | StaticDirOption;
	pageDir?: string | PageDirOption;
	schema: z.ZodSchema<Config>;
	modules?: ModuleOptions | undefined;
}>;

export type UserOptions<Config extends Record<string, unknown>> = Prettify<{
	config: Config;
	pages?: AstroThemePagesOverridesOptions<ThemeName> | undefined;
	overrides?: AstroThemeModulesOptions<ThemeName> | undefined;
}>;

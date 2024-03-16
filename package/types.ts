import type { Option as PageDirOption } from "astro-pages/types";
import type { Option as StaticDirOption } from "astro-public/types";
import type { z } from "astro/zod";

export type ValueOrArray<T> = T | ValueOrArray<T>[];

export type NestedStringArray = ValueOrArray<string>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type ConfigDefault = {
	config: Record<string, unknown>;
	pages: Record<string, boolean>;
	overrides: Record<string, string[] | Record<string, string>>;
};

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

export type AuthorOptions<Config extends ConfigDefault> = Prettify<{
	entrypoint?: string;
	srcDir?: string;
	name?: ThemeName;
	pages?: string | PageDirOption | undefined;
	public?: string | StaticDirOption | undefined;
	schema: z.ZodSchema<Config>;
	modules?: ModuleOptions | undefined;
}>;

export type UserOptions<Config extends ConfigDefault> = Prettify<{
	config: Config;
	pages?: AstroThemePagesOptions<ThemeName> | undefined;
	overrides?: AstroThemeModulesOptions<ThemeName> | undefined;
}>;

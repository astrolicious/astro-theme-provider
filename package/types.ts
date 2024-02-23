import type { Option as PageDirOption } from "astro-pages/types";
import type { z } from "astro/zod";

export type ValueOrArray<T> = T | ValueOrArray<T>[];

export type NestedStringArray = ValueOrArray<string>;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type ConfigDefault = Record<string, unknown>;

export type ExportTypes = Record<
	string,
	undefined | null | false | string | string[] | Record<string, string>
>;

export interface PackageJSON {
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
	name?: ThemeName;
	pages?: string | PageDirOption | undefined;
	schema: z.ZodSchema<Config>;
	modules?: ExportTypes | undefined;
}>;

export type UserOptions<Config extends ConfigDefault> = Prettify<{
	config: Config;
	pages?: AstroThemePagesOptions<ThemeName> | undefined;
	overrides?: AstroThemeModulesOptions<ThemeName> | undefined;
}>;

import type { AstroIntegration } from "astro";
import type { Option as PageDirOption } from "astro-pages";
import type { Option as StaticDirOption } from "astro-public/types";
import type { z } from "astro/zod";
import type { ModuleExports, ModuleImports, ModuleObject } from "../utils/virtual.js";

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

export type AuthorOptions<ThemeName extends string, Schema extends z.ZodTypeAny> = Prettify<{
	name: ThemeName;
	entrypoint?: string;
	srcDir?: string;
	pageDir?: string | PageDirOption;
	publicDir?: string | StaticDirOption;
	middlewareDir?: string | false;
	log?: "verbose" | "minimal" | boolean;
	schema?: Schema;
	imports?: Record<string, string | ModuleImports | ModuleExports | ModuleObject>;
	integrations?: Array<
		| AstroIntegration
		| ((options: { config: z.infer<Schema>; integrations: string[] }) => AstroIntegration | false | null | undefined)
	>;
}>;

export type UserOptions<ThemeName extends string, Schema extends z.ZodTypeAny = z.ZodTypeAny> = {
	config?: z.infer<Schema>;
} & AstroThemeProvider.ThemeOptions[ThemeName];

declare global {
	namespace AstroThemeProvider {
		export interface ThemeOptions
			extends Record<
				string,
				{
					pages?: Record<string, string | boolean>;
					overrides?: Record<string, string[] | Record<string, string>>;
					integrations?: Record<string, boolean>
				}
			> {}
	}
}

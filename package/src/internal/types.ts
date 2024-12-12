import type { AstroConfig, AstroIntegration } from "astro";
import type { Option as PageDirOption } from "astro-pages";
import type { Option as StaticDirOption } from "astro-public/types";
import type { z } from "astro/zod";
import type { ModuleExports, ModuleImports, ModuleObject } from "../utils/modules.ts";
import type { DeepPartial } from "../utils/type-utils.ts";

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
	pageDir?: PageDirOption | string;
	publicDir?: StaticDirOption | string | false | null | undefined;
	middlewareDir?: string | false | null | undefined;
	log?: "verbose" | "minimal" | boolean;
	schema?: Schema;
	imports?: Record<string, string | ModuleImports | ModuleExports | ModuleObject>;
	integrations?: Array<
		| AstroIntegration
		| ((options: { config: z.infer<Schema>; integrations: string[] }) =>
				| AstroIntegration
				| false
				| null
				| undefined
				| void)
	>;
	markdown?:
	| DeepPartial<AstroConfig["markdown"]>
	| ((options: { config: z.infer<Schema>; astroConfig: AstroConfig }) =>
			| DeepPartial<AstroConfig["markdown"]>
			| false
			| null
			| undefined)
	| {
			syntaxHighlight?:
				| DeepPartial<AstroConfig["markdown"]["syntaxHighlight"]>
				| ((options: { config: z.infer<Schema>; astroConfig: AstroConfig }) =>
						| DeepPartial<AstroConfig["markdown"]["syntaxHighlight"]>
						| false
						| null
						| undefined);
			shikiConfig?:
				| DeepPartial<AstroConfig["markdown"]["shikiConfig"]>
				| ((options: { config: z.infer<Schema>; astroConfig: AstroConfig }) =>
						| DeepPartial<AstroConfig["markdown"]["shikiConfig"]>
						| false
						| null
						| undefined);
			remarkPlugins?:
				| (false | undefined | null | AstroConfig["markdown"]["remarkPlugins"][number])[]
				| ((options: { config: z.infer<Schema>; astroConfig: AstroConfig }) =>
						| (false | undefined | null | AstroConfig["markdown"]["remarkPlugins"][number])[]
						| false
						| null
						| undefined);
			rehypePlugins?:
				| (false | undefined | null | AstroConfig["markdown"]["rehypePlugins"][number])[]
				| ((options: { config: z.infer<Schema>; astroConfig: AstroConfig }) =>
						| (false | undefined | null | AstroConfig["markdown"]["rehypePlugins"][number])[]
						| false
						| null
						| undefined);
			remarkRehype?:
				| DeepPartial<AstroConfig["markdown"]["remarkRehype"]>
				| ((options: { config: z.infer<Schema>; astroConfig: AstroConfig }) =>
						| DeepPartial<AstroConfig["markdown"]["remarkRehype"]>
						| false
						| null
						| undefined);
			gfm?:
				| boolean
				| ((options: { config: z.infer<Schema>; astroConfig: AstroConfig }) => boolean | null | undefined);
			smartypants?:
				| boolean
				| ((options: { config: z.infer<Schema>; astroConfig: AstroConfig }) => boolean | null | undefined);
	  };
}>;

export type UserOptions<ThemeName extends string, Schema extends z.ZodTypeAny = z.ZodTypeAny> = {
	config?: z.input<Schema>;
} & AstroThemeProvider.ThemeOptions[ThemeName];

declare global {
	namespace AstroThemeProvider {
		export interface ThemeOptions
			extends Record<
				string,
				{
					pages?: Record<string, string | boolean>;
					overrides?: Record<string, string[] | Record<string, string>>;
					integrations?: Record<string, boolean>;
				}
			> {}
	}
}

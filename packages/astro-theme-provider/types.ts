import { z } from 'astro/zod';

type Prettify<T> = { [K in keyof T]: T[K]; } & {};
type IsExactMatch<T, U> = T extends U ? (U extends T ? true : false) : false;
type DeepPartial<T> = T extends any[] ? T : Prettify<Partial<{ [P in keyof T]: DeepPartial<T[P]> }>>;

export type ExportTypes = Prettify<{
  css?: string[],
  components?: Record<string, string>
  assets?: Record<string, string>;
}>

export type AuthorConfigTypes<Config, Exports extends ExportTypes> = Prettify<{
  name: string;
  entryPoints: Record<string, string>;
  configSchema: z.ZodSchema<Config>;
  exports?: Exports
}>

export type UserConfigTypes<Config, Exports extends ExportTypes> = Prettify<{
  config: Config;
  exports?: IsExactMatch<Exports, ExportTypes> extends true ? never : DeepPartial<Exports>
}>

export type ValidatedConfigTypes<Config> = Prettify<{
  config: Config;
  exports: {
    css: string[],
    components: Record<string, string>
    assets: Record<string, string>;
  }
}>
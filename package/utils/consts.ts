// https://github.com/withastro/astro/blob/main/packages/astro/src/assets/consts.ts#L17
export const IMAGE_FORMATS = ["jpeg", "jpg", "png", "tiff", "webp", "gif", "svg", "avif"];

// https://github.com/withastro/astro/blob/main/packages/astro/src/core/constants.ts#L5
export const MARKDOWN_FORMATS = ["markdown", "mdown", "mdwn", "mdoc", "mkdn", "mdx", "mkd", "md"];

export const CSS_FORMATS = ["css", "scss", "sass", "styl", "less"];

export const DATA_FORMATS = ["json", "yaml"];

export const API_FORMATS = ["ts", "js"];

export const UI_FRAMEWORK_FORMATS = ["tsx", "jsx", "svelte", "vue", "lit"];

export const GLOB_CSS = `**.{${CSS_FORMATS.join(",")}}`;
export const GLOB_API = `**.{${API_FORMATS.join(",")}}`;
export const GLOB_DATA = `**.{${DATA_FORMATS.join(",")}}`;
export const GLOB_ASTRO = `**.astro`;
export const GLOB_IMAGES = `**.{${IMAGE_FORMATS.join(",")}}`;
export const GLOB_MARKDOWN = `**.{${MARKDOWN_FORMATS.join(",")}}`;
export const GLOB_UI_FRAMEWORK = `**.{${UI_FRAMEWORK_FORMATS.join(",")}}`;
export const GLOB_COMPONENTS = `**.{astro,${UI_FRAMEWORK_FORMATS.join(",")}}`;
export const GLOB_PAGES = `**.{astro,${API_FORMATS.join(",")}}`;

export const GLOB_IGNORE = ["!**/node_modules"];

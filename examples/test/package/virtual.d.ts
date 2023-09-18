declare module 'virtual:my-theme/context' {
  const Config: import('astro').AstroConfig;
	export default Config;
}

declare module 'virtual:my-theme/config' {
	const Config: import('my-theme').MyThemeConfig;
	export default Config;
}

declare module 'virtual:my-theme/css' {}

declare module 'virtual:my-theme/components' {
	export const Layout: typeof import('./layouts/Layout.astro').default;
	export const Heading: typeof import('./components/Heading.astro.tsx').default;
}

declare module 'virtual:my-theme/assets' {
	type ImageMetadata = import('astro').ImageMetadata;
	export const avatar: ImageMetadata
}
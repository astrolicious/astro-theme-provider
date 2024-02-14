
declare module 'virtual:my-theme/context' {
  const Config: import('astro').AstroConfig;
	export default Config;
}

declare module 'virtual:my-theme/config' {
	const Config: Parameters<typeof import('C:\Users\Bryce\Desktop\Projects\Astro\astro-theme-provider\examples\test\package\index.ts').default>[0]['config']
	export default Config;
}

declare module 'virtual:my-theme/css' {}

declare module 'virtual:my-theme/components' {
	export const Layout: typeof import('./layouts/Layout.astro').default;
	export const Heading: typeof import('./components/Heading.astro').default;
}

declare module 'virtual:my-theme/assets' {
	type ImageMetadata = import('astro').ImageMetadata;
	export const avatar: ImageMetadata
}
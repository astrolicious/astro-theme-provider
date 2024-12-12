export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? DeepPartial<U>[]
		: T[P] extends object | undefined
			? DeepPartial<T[P]>
			: T[P];
};

export function mergeOptions(target: Record<any, any>, source: Record<any, any>) {
	const merge = { ...target };

	for (const key in source) {
		const value = source[key];

		if (typeof value === "object" && value !== null) {
			if (Array.isArray(value) && Array.isArray(merge[key])) {
				// Combine array values
				merge[key].push(...value);
				continue;
			}

			if (
				typeof merge[key] === "object" &&
				merge[key] !== null &&
				// Skip zod schemas
				!("_def" in value)
			) {
				// Combine object values
				merge[key] = mergeOptions(merge[key], value);
				continue;
			}
		}

		// Overwrite all other values
		merge[key] = value;
	}

	return merge;
}

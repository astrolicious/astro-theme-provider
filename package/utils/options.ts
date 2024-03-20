export function mergeOptions(target: Record<any, any>, source: Record<any, any>) {
	for (const key in source) {
		const value = source[key];

		if (typeof value === "object" && value !== null) {
			if (Array.isArray(value) && Array.isArray(target[key])) {
				// Combine array values
				target[key].push(...value);
				continue;
			}

			if (
				typeof target[key] === "object" &&
				target[key] !== null &&
				// Skip zod schemas
				!("_def" in value)
			) {
				// Combine object values
				target[key] = mergeOptions(target[key], value);
				continue;
			}
		}

		// Overwrite all other values
		target[key] = value;
	}

	return target;
}

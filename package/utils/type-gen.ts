import type { NestedStringArray } from "../types";

export function wrapWithBrackets(lines: NestedStringArray, prefix = "") {
	return [`${prefix}{`, lines, `}`];
}

// Removes extra whitespace from start of lines, keep nested whitespace
export function normalizeLines(lines: string[]) {
	let extraWhitespace = 0;
	for (const line of lines) {
		if (line.trim()) {
			const whitespace = line.length - line.trimStart().length;
			if (!whitespace && whitespace >= extraWhitespace) continue;
			extraWhitespace = whitespace;
		}
	}
	return lines.map((line) => line.trim() && line.slice(extraWhitespace));
}

const NEWLINE = /\n/g;

export class LineBuffer {
	lines: string[] = [];
	depth: number;

	constructor(type?: string | NestedStringArray, depth = 0) {
		if (type) this.add(type, depth);
		this.depth = depth;
	}

	add(type: string | NestedStringArray, depth: number = this.depth) {
		if (typeof type === "string") {
			if (type.trim()) {
				if (NEWLINE.test(type)) {
					for (const line of normalizeLines(type.split("\n"))) {
						this.lines.push(line);
					}
					return;
				}
				this.lines.push("\t".repeat(Math.max(0, depth)) + type);
			}
			return;
		}

		if (Array.isArray(type)) {
			depth++;
			for (const t of type) {
				this.add(t, depth);
			}
		}
	}
}

export function createDtsBuffer() {
	const global = new LineBuffer();
	const interfaces = new Map<string, LineBuffer>();
	const namespaces = new Map<string, LineBuffer>();
	const modules = new Map<string, LineBuffer>();

	function addLinesToDts(type: string | NestedStringArray, depth = 0) {
		global.add(type, depth - 1);
	}

	function addLinesToDtsInterface(
		name: string,
		type: string | NestedStringArray,
		depth = 0,
	) {
		if (!interfaces.has(name))
			interfaces.set(name, new LineBuffer(type, depth));
		else interfaces.get(name)!.add(type, depth);
	}

	function addLinesToDtsNamespace(
		name: string,
		type: string | NestedStringArray,
		depth = 0,
	) {
		if (!namespaces.has(name))
			namespaces.set(name, new LineBuffer(type, depth));
		else namespaces.get(name)!.add(type, depth);
	}

	function addLinesToDtsModule(
		name: string,
		type: string | NestedStringArray,
		depth = 0,
	) {
		if (!modules.has(name)) modules.set(name, new LineBuffer(type, depth));
		else modules.get(name)!.add(type, depth);
	}

	function compileDtsBuffer() {
		console.log();
		return [
			global.lines,
			[...interfaces.entries()].flatMap(([name, buffer]) =>
				wrapWithBrackets(buffer.lines, `\ndeclare interface ${name} `),
			),
			[...namespaces.entries()].flatMap(([name, buffer]) =>
				wrapWithBrackets(buffer.lines, `\ndeclare ${name} `),
			),
			[...modules.entries()].flatMap(([name, buffer]) =>
				wrapWithBrackets(buffer.lines, `\ndeclare module "${name}" `),
			),
		]
			.flat(8)
			.join("\n");
	}

	return {
		addLinesToDts,
		addLinesToDtsInterface,
		addLinesToDtsNamespace,
		addLinesToDtsModule,
		compileDtsBuffer,
	};
}

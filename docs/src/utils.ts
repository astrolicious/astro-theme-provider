import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url)
const thisDir = dirname(thisFile)
export const rootDir = resolve(thisDir, '../')
export const packageDir = resolve(rootDir, '../package')
export const packageJSON = resolve(packageDir, 'package.json')
export const packageJSONJSON = JSON.parse(readFileSync(packageJSON, 'utf-8') || '{}')
export const packageVersion = packageJSONJSON.version
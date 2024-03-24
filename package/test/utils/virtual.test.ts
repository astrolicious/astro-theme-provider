import { describe, expect, test } from 'vitest'
import { resolveModuleObject } from '../../src/utils/virtual.ts'
import { isAbsolute } from 'node:path';

const moduleObject = {
  imports: ["./styles.css"],
  exports: {
    default: "../../Layout.astro"
  }
}

describe('resolveModuleObject()', () => {
  const resolvedModuledObject = resolveModuleObject(import.meta.url, moduleObject)

  test('has root', () => {
    expect(resolvedModuledObject).toHaveProperty("root")
  })

  test('imports are absolute', () => {
    expect(resolvedModuledObject.imports.every(isAbsolute)).toBe(true)
  })

  test('exports are absolute', () => {
    expect(Object.values(resolvedModuledObject.exports).every(isAbsolute)).toBe(true)
  })
})

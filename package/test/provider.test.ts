import { describe, expect, test } from 'vitest'
import { z } from 'astro/zod';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import defineTheme from '../index.ts'

const entrypoint = resolve(dirname(fileURLToPath(import.meta.url).toString()), '../../playground/package/index.ts')

const authorOptions = {
  entrypoint,
}

describe('defineTheme', () => {

  test('should run', () => {    
    expect(() => {      
      const theme = defineTheme(authorOptions)
    }).not.toThrow()
  })
})

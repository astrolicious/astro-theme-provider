import { describe, expect, test, vi } from 'vitest'
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import defineTheme from '../index.ts'
import type { AstroConfig, AstroIntegrationLogger, HookParameters } from 'astro';

vi.mock('astro-integration-kit/utilities')

const thisFile = fileURLToPath(import.meta.url).toString()
const playgroundDir = resolve(dirname(thisFile), 'mock')
const packageRoot = resolve(playgroundDir, 'package')
const packageEntrypoint = resolve(packageRoot, 'index.ts')
const projectRoot = resolve(playgroundDir, 'project')
const projectSrc = resolve(projectRoot, 'src')

const astroConfigSetupParamsStub = (
	params?: HookParameters<"astro:config:setup">,
): HookParameters<"astro:config:setup"> => ({
	logger: {
    fork: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  } as unknown as AstroIntegrationLogger,
	addClientDirective: vi.fn(),
	addDevToolbarApp: vi.fn(),
	addMiddleware: vi.fn(),
	addRenderer: vi.fn(),
	addWatchFile: vi.fn(),
	command: "dev",
	injectRoute: vi.fn(),
	injectScript: vi.fn(),
	isRestart: false,
	updateConfig: vi.fn(),
	addDevOverlayPlugin: vi.fn(),
	config: {
    root: pathToFileURL(projectRoot),
    srcDir: pathToFileURL(projectSrc)
  } as unknown as AstroConfig,
	...(params || {}),
});

const authorOptions = {
  entrypoint: packageEntrypoint,
}

describe('defineTheme', () => {
  test('should run', () => {    
    expect(() => {      
      const theme = defineTheme(authorOptions)
    }).not.toThrow()
  })
})

describe('theme integration', () => {
  test('should run', () => {    
    const theme = defineTheme(authorOptions)()
    const params = astroConfigSetupParamsStub()
    expect(() => {
      theme.hooks['astro:config:setup']?.(params)
    }).not.toThrow()
  })
})

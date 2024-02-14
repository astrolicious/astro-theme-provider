import { definePlugin } from "astro-integration-kit";
import { addDts } from "astro-integration-kit/utilities";
import { LineBuffer, wrapWithBrackets } from '../utils';

export default definePlugin({
  name: "createDtsBuffer",
  hook: "astro:config:setup",
  implementation:
    ({ config, logger }) => {
      return (name: string) => {
        const {
          addLinesToDts,
          addLinesToDtsInterface,
          addLinesToDtsNamespace,
          addLinesToDtsModule,
          compileDtsBuffer
        } = createDtsBuffer()

        function writeDtsBuffer() {
          addDts({
            name: name,
            content: compileDtsBuffer(),
            root: config.root,
            srcDir: config.srcDir,
            logger,
          })
        }

        return {
          addLinesToDts,
          addLinesToDtsInterface,
          addLinesToDtsNamespace,
          addLinesToDtsModule,
          compileDtsBuffer,
          writeDtsBuffer
        }
      }
    }
});

function createDtsBuffer() {
  const global = new LineBuffer()
  const interfaces = new Map<string, LineBuffer>()
  const namespaces = new Map<string, LineBuffer>()
  const modules = new Map<string, LineBuffer>()

  function addLinesToDts(type: string | NestedStringArray, depth: number = 0) {
    global.add(type, depth - 1)
  }

  function addLinesToDtsInterface(name: string, type: string | NestedStringArray, depth: number = 0) {
    if (!interfaces.has(name)) interfaces.set(name, new LineBuffer(type, depth))
    else interfaces.get(name)!.add(type, depth)
  }

  function addLinesToDtsNamespace(name: string, type: string | NestedStringArray, depth: number = 0) {
    if (!namespaces.has(name)) namespaces.set(name, new LineBuffer(type, depth))
    else namespaces.get(name)!.add(type, depth)
  }

  function addLinesToDtsModule(name: string, type: string | NestedStringArray, depth: number = 0) {
    if (!modules.has(name)) modules.set(name, new LineBuffer(type, depth))
    else modules.get(name)!.add(type, depth)
  }

  function compileDtsBuffer() {
    console.log()
    return (
      [
        global.lines,
        [...interfaces.entries()].map(([name, buffer]) => wrapWithBrackets(buffer.lines, `declare interface ${name} `)).flat(),
        [...namespaces.entries()].map(([name, buffer]) => wrapWithBrackets(buffer.lines, `declare ${name} `)).flat(),
        [...modules.entries()].map(([name, buffer]) => wrapWithBrackets(buffer.lines, `declare module '${name}' `)).flat(),
      ].flat(8).join('\n')
    )
  }

  return {
    addLinesToDts,
    addLinesToDtsInterface,
    addLinesToDtsNamespace,
    addLinesToDtsModule,
    compileDtsBuffer
  }
}
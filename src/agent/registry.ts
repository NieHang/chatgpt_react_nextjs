import type { Tool } from '@/agent/type'
import type { FunctionTool } from 'openai/resources/responses/responses.js'

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  register(tool: Tool) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name ${tool.name} is already registered.`)
    }
    this.tools.set(tool.name, tool)
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  toAPIFormat(): FunctionTool[] {
    return this.getAll().map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      strict: false, // allow extra fields
    }))
  }
}

import { ReadFileTool } from '@/agent/tools/readFile'
import { WriteFileTool } from '@/agent/tools/writeFile'

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  registry.register(ReadFileTool)
  registry.register(WriteFileTool)
  return registry
}

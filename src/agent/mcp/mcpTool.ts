import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { Tool as MCPToolDef } from '@modelcontextprotocol/sdk/types.js'
import { Tool, ToolInputSchema, ToolResult, ToolContext } from '@/agent/type'
import type { McpManager } from './manager'

const MAX_MCP_DESCRIPTION_LENGTH = 2048

function buildMcpToolName(serverName: string, toolName: string) {
  return `mcp_${serverName}_${toolName}`
}

function joinTextBlocks(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .filter(
      (block): block is { text: string; type: 'text' } => block.type === 'text',
    )
    .map((block) => block.text)
    .join('\n')
}

export function wrapMcpTool(
  manager: McpManager,
  serverName: string,
  def: MCPToolDef,
): Tool {
  const rawDesc = def.description ?? ''
  const description =
    rawDesc.length > MAX_MCP_DESCRIPTION_LENGTH
      ? rawDesc.slice(0, MAX_MCP_DESCRIPTION_LENGTH) + '... [truncated]'
      : rawDesc

  return {
    name: buildMcpToolName(serverName, def.name),
    description,
    inputSchema: (def.inputSchema as ToolInputSchema) ?? {
      type: 'object',
      properties: {},
      required: [],
    },
    isReadOnly: def.annotations?.readOnlyHint === true,
    async execute(
      args: Record<string, unknown>,
      toolContext?: ToolContext,
    ): Promise<ToolResult> {
      try {
        const result = await manager.callTool(serverName, def.name, args, {
          meta: {
            userId: toolContext?.userId,
            conversationId: toolContext?.conversationId,
          },
          signal: toolContext?.signal,
        })
        return {
          content: joinTextBlocks(result?.content),
          isError: result?.isError === true,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return {
          content: `MCP too call failed: ${msg}`,
          isError: true,
        }
      }
    },
  }
}


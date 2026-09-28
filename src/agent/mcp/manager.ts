import 'server-only'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  ToolListChangedNotificationSchema,
  type CallToolResult,
  type Tool as MCPToolDef,
} from '@modelcontextprotocol/sdk/types.js'
import type { Tool } from '@/agent/type'
import { type McpServerConfig, connectMcpServer } from './client'
import { MCP_SERVERS } from './servers'
import { wrapMcpTool } from './mcpTool'

type ServerStatus = 'idle' | 'connecting' | 'connected' | 'failed'

interface ServerState {
  name: string
  config: McpServerConfig
  status: ServerStatus
  client?: Client
  transport?: StreamableHTTPClientTransport
  tools: MCPToolDef[]
  connecting?: Promise<void>
  retryAttempt: number
  retryTimer?: NodeJS.Timeout
  lastError?: string
}

const MAX_RETRY_DELAY_MS = 60_000
const TOOL_CALL_TIMEOUT_MS = 60_000

export class McpManager {
  private servers = new Map<string, ServerState>()
  private closed = false

  constructor(configs: Record<string, McpServerConfig>) {
    for (const [name, config] of Object.entries(configs)) {
      this.servers.set(name, {
        name,
        config,
        status: 'idle',
        tools: [],
        retryAttempt: 0,
      })
    }
  }

  async start(): Promise<void> {
    await Promise.allSettled(
      [...this.servers.values()].map((s) => this.ensureConnected(s)),
    )
    for (const s of this.servers.values()) {
      console.log(`[MCP] ${s.name}: ${s.status} (${s.tools.length} tools)`)
    }
  }

  getTools(): Tool[] {
    const out: Tool[] = []
    const seen = new Set<string>()
    for (const s of this.servers.values()) {
      if (s.status !== 'connected') continue
      for (const def of s.tools) {
        const tool = wrapMcpTool(this, s.name, def)
        if (seen.has(tool.name)) {
          console.warn(`[MCP] Duplicate tool name ${tool.name}, skipping`)
          continue
        }
        seen.add(tool.name)
        out.push(tool)
      }
    }
    return out
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
    opts: {
      meta?: Record<string, unknown>
      signal?: AbortSignal
    } = {},
  ): Promise<CallToolResult> {
    const state = this.servers.get(serverName)
    if (!state) throw new Error(`Unknown MCP server: ${serverName}`)

    await this.ensureConnected(state)

    const call = () =>
      state.client?.callTool(
        {
          name: toolName,
          arguments: args,
          _meta: opts.meta,
        },
        undefined,
        {
          signal: opts.signal,
          timeout: TOOL_CALL_TIMEOUT_MS,
        },
      ) as Promise<CallToolResult>

    try {
      return await call()
    } catch (err) {
      console.warn(`[MCP] ${serverName} session expired, reconnecting`)
      await this.reset(state)
      await this.ensureConnected(state)
      return await call()
    }
  }

  getStatus() {
    return [...this.servers.values()].map(
      ({ name, status, tools, lastError }) => ({
        name,
        status,
        tools,
        lastError,
      }),
    )
  }

  async close(): Promise<void> {
    this.closed = true
    await Promise.allSettled(
      [...this.servers.values()].map((s) => this.reset(s)),
    )
  }

  private ensureConnected(state: ServerState): Promise<void> | undefined {
    if (this.closed) return Promise.reject(new Error('McpManger is closed'))
    if (state.status === 'connected') return Promise.resolve()
    if (!state.connecting) {
      state.connecting = this.connect(state).finally(() => {
        state.connecting = undefined
      })
    }
    return state.connecting
  }

  private handleDisconnect(state: ServerState, client: Client) {
    if (state.client !== client) return
    console.warn(`[MCP] ${state.name} disconnected`)
    state.client = undefined
    state.transport = undefined
    state.status = 'idle'
    this.scheduleRetry(state)
  }

  private async connect(state: ServerState): Promise<void> {
    clearTimeout(state.retryTimer)
    state.status = 'connecting'
    try {
      const { client, tools, transport } = await connectMcpServer(
        state.name,
        state.config,
      )

      client.onclose = () => this.handleDisconnect(state, client)
      client.onerror = (err) =>
        console.warn(`[MCP] ${state.name} error: ${err.message}`)

      client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
        state.tools = tools
      })

      state.client = client
      state.tools = tools
      state.transport = transport
      state.status = 'connected'
      state.retryAttempt = 0
      state.lastError = undefined
    } catch (err) {
      state.status = 'failed'
      state.lastError = err instanceof Error ? err.message : String(err)
      console.error(`[MCP] ${state.name} connect failed: ${state.lastError}`)
      this.scheduleRetry(state)
      throw err
    }
  }

  private scheduleRetry(state: ServerState) {
    if (this.closed) return
    clearTimeout(state.retryTimer)
    const delay = Math.min(1000 * 2 ** state.retryAttempt, MAX_RETRY_DELAY_MS)
    state.retryAttempt++
    state.retryTimer = setTimeout(() => {
      this.ensureConnected(state)?.catch(() => {})
    }, delay)
    state.retryTimer.unref()
  }

  private async reset(state: ServerState) {
    clearTimeout(state.retryTimer)
    const { client, transport } = state
    state.client = undefined
    state.transport = undefined
    state.status = 'idle'
    await transport?.terminateSession()
    await client?.close()
  }
}

const globalForMcp = globalThis as unknown as { __mcpManager: McpManager }

export function getMcpManager(): McpManager {
  if (!globalForMcp.__mcpManager) {
    const manager = new McpManager(MCP_SERVERS)
    globalForMcp.__mcpManager = manager
    void manager.start()

    process.once('SIGTERM', () => {
      void manager.close().finally(() => process.exit(0))
    })
  }

  return globalForMcp.__mcpManager
}


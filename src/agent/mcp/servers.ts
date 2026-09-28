import 'server-only'
import { McpServerConfig } from './client'

function required(name: string): string | undefined {
  const v = process.env[name]
  if (!v) console.warn(`[MCP] ${name} is not set`)
  return v
}

function buildServers(): Record<string, McpServerConfig> {
  const servers: Record<string, McpServerConfig> = {}

  const rollingGoUrl = required('ROLLING_GO')
  const rollingGoApiKey = required('ROLLING_GO_API_KEY')
  if (rollingGoUrl) {
    servers.rollingGo = {
      url: rollingGoUrl,
      headers: {
        Authorization: `Bearer ${rollingGoApiKey}`,
      },
    }
  }

  return servers
}

export const MCP_SERVERS = buildServers()


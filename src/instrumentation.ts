export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getMcpManager } = await import('@/agent/mcp/manager')
    getMcpManager()
  }
}


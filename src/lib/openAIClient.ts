import 'server-only'
import OpenAI from 'openai'
import { ProxyAgent } from 'undici'

const globalForOpenAI = globalThis as typeof globalThis & {
  openAIClient?: OpenAI
}

export default function getOpenAIClient(apiKey: string) {
  if (!apiKey && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined

  globalForOpenAI.openAIClient = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
    fetchOptions: dispatcher ? { dispatcher } : undefined,
  })

  return globalForOpenAI.openAIClient
}

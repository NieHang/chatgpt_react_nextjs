import NextAuth from 'next-auth'
import { customFetch } from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { mongoClientPromise } from '@/lib/db'

const proxyUrl =
  process.env.AUTH_HTTP_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined

type UndiciFetchInput = Parameters<typeof undiciFetch>[0]
type UndiciFetchInit = Parameters<typeof undiciFetch>[1]

const fetchWithProxy = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const proxyInit: UndiciFetchInit = {
    ...(init as UndiciFetchInit),
    dispatcher,
  }

  const response = await undiciFetch(input as UndiciFetchInput, proxyInit)

  return response as unknown as Response
}

const authFetch: typeof fetch = (input, init) => {
  if (!dispatcher) return fetch(input, init)

  return fetchWithProxy(input, init)
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(mongoClientPromise, {
    databaseName: process.env.MONGODB_DB,
  }),

  providers: [
    Google({ [customFetch]: authFetch }),
    GitHub({ [customFetch]: authFetch }),
  ],

  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})

import { getDb } from '@/lib/db'

interface MemoryInfo {
  name: string
  type: 'User' | 'Project'
  content: string
}

const SYSTEM_PROMPT =
  `You are a helpful assistant. You will be given a user input and you should respond with a helpful answer. You should also ask the user for clarification if needed.` +
  'IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.'

export async function loadMemories({
  userId,
  projectName = 'default',
}: {
  userId: string
  projectName?: string
}): Promise<MemoryInfo[]> {
  if (!userId) throw new Error('User ID is required to load memories')

  const db = await getDb()
  if (!db) throw new Error('Database unavailable while loading memories')

  const projectMemory = await db
    .collection<{
      userId: string
      projectName: string
      content: string
    }>('memories')
    .findOne({ userId, projectName })

  if (
    typeof projectMemory?.content !== 'string' ||
    !projectMemory.content.trim()
  ) {
    return []
  }

  return [
    {
      name: projectName,
      type: projectName === 'default' ? 'User' : 'Project',
      content: projectMemory.content,
    },
  ]
}

export function assembleMemory(memories: MemoryInfo[]): string {
  if (memories.length === 0) return SYSTEM_PROMPT
  const outputs = memories.map((memory) => {
    const description =
      memory.type === 'Project'
        ? ' (project instructions, checked into the conversations)'
        : " (user's private global instructions for all projects)"

    return `Contents of ${memory.name}${description}:\n\n${memory.content.trim()}`
  })
  return `${SYSTEM_PROMPT}\n\n${outputs.join('\n\n')}`
}


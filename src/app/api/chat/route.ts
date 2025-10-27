export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { messages } = await req.json()

  if (!process.env.OPENAI_API_KEY) {
    return new Response('OpenAI API key not configured', { status: 500 })
  }

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      messages: messages ?? [
        {
          role: 'user',
          content: 'Hello, world!',
        },
      ],
      temperature: 0.7,
    }),
  })

  if (!aiRes.ok || !aiRes.body) {
    const text = await aiRes.text().catch(() => '<no body>')
    return new Response('Error from OpenAI API: ' + text, {
      status: aiRes.status,
    })
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      const reader = aiRes.body!.getReader()
      let buffer = ''

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') {
              controller.close()
              return
            }

            try {
              const json = JSON.parse(data)
              const delta = json.choices[0].delta.content
              if (delta) {
                const chunk = encoder.encode(delta)
                controller.enqueue(chunk)
              }
            } catch (e) {
              console.error('Error parsing JSON:', e)
            }
          }
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}


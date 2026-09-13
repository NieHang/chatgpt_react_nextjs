import { afterEach, expect, it, vi } from 'vitest'
import { ReadFileTool } from './readFile'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('returns the resolved ID and next page so a named file can be edited', async () => {
  const fileId = '0123456789abcdef01234567'
  vi.stubEnv('APP_BASE_URL', 'http://localhost:3001')
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(Response.json({ files: [{ _id: fileId }] }))
    .mockResolvedValueOnce(new Response('first\nsecond', {
      headers: { 'content-type': 'text/plain' },
    }))
    .mockResolvedValueOnce(new Response('first\nsecond', {
      headers: { 'content-type': 'text/plain' },
    }))
  vi.stubGlobal('fetch', fetchMock)

  const first = await ReadFileTool.execute(
    { file_name: 'notes.txt', limit: 1 },
    { userId: 'user-1' },
  )
  expect(first.isError).toBe(false)
  expect(JSON.parse(first.content)).toMatchObject({
    file_id: fileId,
    total_lines: 2,
    offset: 0,
    next_offset: 1,
  })

  const last = await ReadFileTool.execute(
    { file_id: fileId, offset: 1, limit: 1 },
    { userId: 'user-1' },
  )
  expect(JSON.parse(last.content)).toMatchObject({
    file_id: fileId,
    text: '2: second',
    next_offset: null,
  })
})

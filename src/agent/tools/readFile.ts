import type { Tool, ToolContext, ToolResult } from '@/agent/type'

export const ReadFileTool: Tool = {
  name: 'ReadFile',
  description:
    'Read the content of an uploaded file by its MongoDB file ID. ' +
    'Supports plain text, Markdown, PDF, and Word documents. ' +
    'Returns extracted text with 1-based line numbers. ' +
    'Use offset (0-based) and limit to read a specific range of the extracted text.',
  inputSchema: {
    type: 'object',
    properties: {
      file_id: {
        type: 'string',
        description:
          'The ID of the file to read. Can be absolute or relative to the current working directory.',
      },
      offset: {
        type: 'number',
        description:
          'Line number to start reading from (0-based index). Defaults to 0',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of lines to read. Defaults to 100',
      },
    },
    required: ['file_id'],
  },
  isReadOnly: true,
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const fileId = args.file_id as string
    const offset = (args.offset as number) || 0
    const limit = (args.limit as number) || 100

    if (typeof fileId !== 'string' || !/^[a-f\d]{24}$/i.test(fileId)) {
      return {
        content: 'Invalid MongoDB file ID',
        isError: true,
      }
    }

    try {
      const baseUrl = process.env.APP_BASE_URL

      const response = await fetch(`${baseUrl}/api/files/${fileId}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        return {
          content: `Failed to fetch file content: ${response.statusText}`,
          isError: true,
        }
      }

      const mime =
        response.headers.get('content-type')?.split(';')[0].trim() || ''

      const isText =
        mime.startsWith('text/') ||
        mime === 'application/json' ||
        mime === 'application/xml'

      if (!isText) {
        return {
          content: `File is not a text file (MIME type: ${mime})`,
          isError: true,
        }
      }

      const text = await response.text()
      const lines = text.split(/\r\n|\n|\r/)
      const selectedLines = lines.slice(offset, offset + limit)
      const numbered = selectedLines
        .map((line, index) => `${offset + index + 1}: ${line}`)
        .join('\n')

      let result = numbered

      // TODO: add a new method to check if the size of file is too large such as > 256kb
      if (lines.length > offset + limit) {
        result += `\n... (truncated, ${lines.length - (offset + limit)} more lines)`
      }

      return {
        content: result,
        isError: false,
      }
    } catch (error) {
      return {
        content: `Error reading file: ${error}`,
        isError: true,
      }
    }
  },
}

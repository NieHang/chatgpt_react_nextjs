import type { Tool, ToolContext, ToolResult } from '@/agent/type'

export const ReadFileTool: Tool = {
  name: 'ReadFile',
  description:
    'Search uploaded files by exact filename, or read a file by its MongoDB file ID. ' +
    'Use this tool when the user asks to search for, find, locate, open, or read an uploaded file, including image filenames. ' +
    'For example, "can you search openjobs.png" means call this tool with file_name: "openjobs.png". ' +
    'Search by filename even when no file ID or current attachment is available; ask for a filename only when neither an ID nor a filename can be identified. ' +
    'If multiple matches are returned, use explicit user criteria or ask the user to choose, then call again with the selected file_id. ' +
    'A unique match is automatically read. Content reading supports text MIME types and returns 1-based line numbers; binary files such as PNG, PDF, and Word documents currently return an unsupported-content error. ' +
    'Use offset (0-based) and limit to read a specific range of text.',
  inputSchema: {
    type: 'object',
    properties: {
      file_id: {
        type: 'string',
        description:
          'The ID of the file to read. Can be absolute or relative to the current working directory.',
      },
      file_name: {
        type: 'string',
        description:
          'Uploaded filename to search for. ' +
          'Provide this when the user asks to search for or read a named file and its MongoDB file ID is unknown. ' +
          'The filename is sufficient to call this tool; do not ask the user for a file ID first. ' +
          'Omit file_name when using a known file_id. Never silently select the first result when multiple files match.',
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
  },
  isReadOnly: true,
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    let fileId = args.file_id as string
    const { userId } = context
    const fileName = args.file_name as string
    const offset = (args.offset as number) || 0
    const limit = (args.limit as number) || 100
    const baseUrl = process.env.APP_BASE_URL

    if (!fileId && !fileName) {
      return {
        content: 'Ask the user to identify or upload the file',
        isError: true,
      }
    }

    if (!fileId && fileName) {
      const response = await fetch(
        `${baseUrl}/api/files/search/${encodeURIComponent(fileName)}?userId=${encodeURIComponent(userId)}`,
      )

      const body = await response.json()

      if (body.files.length === 1) {
        fileId = body.files[0]._id
      } else if (body.files.length > 1) {
        return {
          content: JSON.stringify({
            status: 'multiple_matches',
            message: 'Ask the user to choose, then call ReadFile with file_id)',
            files: body.files,
          }),
          isError: false,
        }
      }
    }

    if (typeof fileId !== 'string' || !/^[a-f\d]{24}$/i.test(fileId)) {
      return {
        content: 'Invalid MongoDB file ID',
        isError: true,
      }
    }

    try {
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

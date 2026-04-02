// AGI Alpha MCP client — handles JSON + SSE responses

export async function callMcp(tool, args, timeoutMs = 30000) {
  const endpoint = process.env.AGI_ALPHA_MCP
  if (!endpoint) throw new Error('AGI_ALPHA_MCP not set')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: tool, arguments: args }
    }),
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!res.ok) throw new Error(`MCP HTTP ${res.status}: ${tool}`)

  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('text/event-stream')) {
    const text = await res.text()
    for (const line of text.split('\n')) {
      if (!line.startsWith('data:')) continue
      try {
        const d = JSON.parse(line.slice(5).trim())
        if (d.result !== undefined) return unpack(d.result)
        if (d.error) throw new Error(d.error.message || JSON.stringify(d.error))
      } catch (e) {
        if (e.message.startsWith('MCP')) throw e
      }
    }
    throw new Error(`No result in SSE stream for ${tool}`)
  }

  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return unpack(data.result)
}

// Unwrap MCP content envelope → raw value
function unpack(result) {
  if (!result) return result
  // { content: [{ type: 'text', text: '...' }] }
  if (result.content && Array.isArray(result.content)) {
    for (const item of result.content) {
      if (item.type === 'text') {
        try { return JSON.parse(item.text) } catch { return item.text }
      }
    }
  }
  return result
}

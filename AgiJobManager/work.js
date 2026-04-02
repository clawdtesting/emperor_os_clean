// Single Claude API call — the only LLM call in the entire pipeline
// Returns raw text (JSON string) from the model

import { getHandler } from './handlers/index.js'

const API = 'https://api.anthropic.com/v1/messages'

export async function claude(system, user, { maxTokens = 8192, temperature = 0 } = {}) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not set')

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }]
    }),
    signal: AbortSignal.timeout(120_000)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('Empty response from Claude')

  // Strip markdown code fences if model wraps JSON
  return text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
}

// Route spec to the right handler, get back the work result
export async function doWork(jobId, spec) {
  const category = (
    spec?.properties?.category ||
    spec?.attributes?.find(a => a.trait_type === 'Category')?.value ||
    'other'
  ).toLowerCase()

  console.log(`  [work] category: ${category}`)
  const handler = getHandler(category)
  const result = await handler(spec)

  console.log(`  [work] produced ${result.filename} (${result.content.length} chars)`)
  return result
}

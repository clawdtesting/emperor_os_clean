// Routes jobs to local Ollama models via llm-router.js.
// Falls back to the handler pipeline; image/design jobs are auto-declined.

import { getHandler } from './handlers/index.js'
import { selectModel } from './llm-router.js'

// Route spec to the right handler, get back the work result
export async function doWork(jobId, spec) {
  // Pre-flight: decline image/design jobs before hitting a handler
  const { decline, reason } = selectModel(spec)
  if (decline) {
    console.log(`  [work] SKIPPED — ${reason}`)
    return { skipped: true, reason }
  }

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

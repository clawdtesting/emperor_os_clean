// contracts/AGIJobManager-v2/adapter.js
// Adapter for AGIJobManager v2 payload tagging.

export const CONTRACT_VERSION = 'v2';

/**
 * Tag a raw MCP job payload with the contract version used by the orchestrator.
 */
export function tagJob(entry) {
  return { ...entry, _contractVersion: CONTRACT_VERSION };
}

export default {
  version: CONTRACT_VERSION,
  tagJob
};

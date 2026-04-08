// contracts/AGIJobManager-v1/adapter.js
// Adapter for AGIJobManager v1 list_jobs/get_job payload normalization.

export const CONTRACT_VERSION = 'v1';

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

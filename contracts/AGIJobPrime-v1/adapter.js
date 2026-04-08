// contracts/AGIJobPrime-v1/adapter.js
// Adapter for AGIJobPrime v1 payload tagging.

export const CONTRACT_VERSION = 'prime_v1';

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

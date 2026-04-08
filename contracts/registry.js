// contracts/registry.js
// Central registry of active contract adapters.
// Add new versions here when they go live — nothing else needs to change.

const ADAPTERS = [
  {
    version: 'v1',
    adapter: {
      // Tag each raw list_jobs entry with its contract version
      tagJob(entry) {
        return { ...entry, _contractVersion: 'v1' }
      }
    }
  }
]

/**
 * Returns active { version, adapter } pairs used by discover + orchestrator.
 */
export function getActiveAdapters() {
  return ADAPTERS
}

/**
 * Unique state key for a job. Format: v1_123
 * Matches buildVersionedJobId() in agent/state.js.
 */
export function buildStateKey(version, jobId) {
  return `${version}_${jobId}`
}

/**
 * Artifact directory name for a job. Format: v1_123
 * artifact-manager.js detects the underscore and uses it as-is.
 */
export function buildArtifactDirName(version, jobId) {
  return `${version}_${jobId}`
}

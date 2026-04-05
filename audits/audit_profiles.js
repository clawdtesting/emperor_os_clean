// audits/audit_profiles.js
// Defines named audit profiles that control which families run and how.

import { AUDIT_FAMILIES } from "./lib/constants.js";

/**
 * Profiles:
 *   fast     - Static + safety + doctrine only. No network. Runs in seconds.
 *   full     - All families. Full system validation.
 *   presign  - Gate run before a human signs a transaction.
 *   runtime  - Integration checks only. Validates live dependencies.
 */

export const PROFILES = {
  fast: {
    name: "fast",
    description: "Static code/config inspection + safety + doctrine. No network required.",
    families: ["static", "safety", "doctrine"],
    parallel: true,
    stopOnFirstCritical: true,
    timeoutMs: 30_000,
  },

  full: {
    name: "full",
    description: "Complete audit across all families. Requires live environment.",
    families: AUDIT_FAMILIES,
    parallel: false,
    stopOnFirstCritical: false,
    timeoutMs: 300_000,
  },

  presign: {
    name: "presign",
    description: "Pre-signing gate. Runs safety + protocol + presign checks only.",
    families: ["safety", "protocol", "presign"],
    parallel: false,
    stopOnFirstCritical: true,
    timeoutMs: 60_000,
  },

  runtime: {
    name: "runtime",
    description: "Live dependency readiness checks (RPC, MCP, IPFS, filesystem).",
    families: ["integration"],
    parallel: true,
    stopOnFirstCritical: false,
    timeoutMs: 60_000,
  },
};

export const DEFAULT_PROFILE = "fast";

export function getProfile(name) {
  const profile = PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown audit profile: "${name}". Available: ${Object.keys(PROFILES).join(", ")}`);
  }
  return profile;
}

export function listProfiles() {
  return Object.values(PROFILES).map(p => ({
    name: p.name,
    description: p.description,
    families: p.families,
  }));
}

export function getFamiliesForProfile(name) {
  return getProfile(name).families;
}

export function isValidProfile(name) {
  return Object.prototype.hasOwnProperty.call(PROFILES, name);
}

# integration Audit Report

⚠️ **Status: WARN**

| Metric | Value |
|---|---|
| Started | 2026-04-06T19:37:15.059Z |
| Completed | 2026-04-06T19:37:15.059Z |
| Duration | 0ms |
| Pass | 3 |
| Warn | 1 |
| Fail | 0 |
| Critical | 0 |

## Checks

### ✅ integration.rpc_health — pass

RPC healthy — chainId 1 (mainnet), block #24822768 (257ms)
_Duration: 257ms_

### ❓ integration.mcp_connectivity — 406

MCP endpoint returned HTTP 406 (https://agialpha.com/api/mcp)
_Duration: 179ms_

### ⚠️ integration.ipfs_health — warn

1 IPFS endpoint(s) unreachable, 2 healthy: cloudflare-ipfs
_Duration: 856ms_

### ✅ integration.github_sync_health — pass

Git repository is healthy and in sync
_Duration: 770ms_

### ✅ integration.file_system_permissions — pass

All 6 critical directories are accessible
_Duration: 1ms_

# Master Audit Report

⚠️ **Status: WARN**

| Metric | Value |
|---|---|
| Started | 2026-04-06T20:52:23.153Z |
| Completed | 2026-04-06T20:52:24.516Z |
| Duration | 0ms |
| Pass | 18 |
| Warn | 3 |
| Fail | 0 |
| Critical | 0 |

## Audit Family Breakdown

| Audit | Status | Duration | Pass | Warn | Fail | Critical |
|---|---|---|---|---|---|---|
| static | ✅ pass | 0ms | 9 | 0 | 0 | 0 |
| protocol | ⚠️ warn | 0ms | 6 | 1 | 0 | 0 |
| doctrine | ⚠️ warn | 0ms | 3 | 2 | 0 | 0 |

## Checks

### ✅ workspace_boundary — pass

No workspace boundary violations detected
_Duration: 141ms_

### ✅ forbidden_signing_calls — pass

No forbidden signing patterns found in worker code
_Duration: 342ms_

### ✅ forbidden_broadcast_calls — pass

No forbidden broadcast patterns found in worker code
_Duration: 103ms_

### ✅ env_contracts — pass

All environment contract addresses match canonical values

### ✅ required_files — pass

All required files present

### ✅ config_env_required — pass

All required environment variables present

### ✅ config_file_exists — pass

agent/config.js exists

### ✅ unsigned_handoff_only — pass

No signing logic found in worker code — unsigned handoff doctrine upheld
_Duration: 25ms_

### ✅ no_private_key_usage — pass

No private key references found in worker code
_Duration: 52ms_

### ✅ protocol.chainid_validation — pass

Chain ID 1 is valid

### ✅ protocol.contract_address_validation — pass

All 3 contract addresses are valid and checksummed
_Duration: 2ms_

### ✅ protocol.function_selector_validation — pass

All 2 function selectors match canonical values: submitCompletion(uint256,string,bytes32)=0x5635b65d, approve(address,uint256)=0x095ea7b3
_Duration: 3ms_

### ✅ protocol.calldata_encoding — pass

ABI encoding verified for submitCompletion — selector=0x5635b65d
_Duration: 1ms_

### ✅ protocol.calldata_decoding — pass

ABI decoding utilities verified for AGI contract signatures
_Duration: 1ms_

### ✅ protocol.erc20_approval_flow — pass

ERC20 approve calldata encodes correctly — selector=0x095ea7b3, spender=0xB3AAeb69b630f0299791679c063d68d6687481d1
_Duration: 1ms_

### ⚠️ protocol.prime_deadline_logic — warn

No deadline-related code found in agent/core — PRIME deadline logic may be missing
_Duration: 351ms_

### ⚠️ doctrine.max_one_llm_call_per_job — warn

LLM audit log not found — cannot verify call budget

### ⚠️ doctrine.no_llm_before_assignment — warn

LLM audit log not found — cannot verify pre-assignment calls
_Duration: 1ms_

### ✅ doctrine.unsigned_handoff_only — pass

All 0 tx package(s) are unsigned — handoff boundary intact

### ✅ doctrine.deterministic_scoring_required — pass

No nondeterministic constructs detected in agent/core source
_Duration: 77ms_

### ✅ doctrine.workspace_scope_only — pass

No out-of-scope path references detected — workspace boundary intact
_Duration: 183ms_

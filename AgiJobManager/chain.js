// Ethers v6 — sign and broadcast tx calldata returned by AGI Alpha MCP

import { ethers } from 'ethers'

let _wallet = null

function wallet() {
  if (_wallet) return _wallet
  const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL?.trim())
  _wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY?.trim(), provider)
  return _wallet
}

export const address = () => wallet().address

// Send a single tx and wait for confirmation
export async function broadcast(to, data, value = '0x0') {
  const w = wallet()
  const tx = await w.sendTransaction({ to, data, value })
  console.log(`  tx sent: ${tx.hash}`)
  const receipt = await tx.wait()
  if (receipt.status === 0) throw new Error(`tx reverted: ${tx.hash}`)
  console.log(`  confirmed in block ${receipt.blockNumber}`)
  return receipt
}

// Parse tx calldata from MCP response and broadcast
// apply_for_job returns: { approve: {to, data}, apply: {to, data} }
// request_job_completion returns: { to, data } or similar
export async function broadcastMcpTx(mcpResult) {
  const raw = JSON.stringify(mcpResult)

  // Case 1: approve + apply (apply_for_job)
  if (mcpResult?.approve && mcpResult?.apply) {
    console.log('  broadcasting ERC20 approve...')
    await broadcast(mcpResult.approve.to, mcpResult.approve.data)
    console.log('  broadcasting applyForJob...')
    return await broadcast(mcpResult.apply.to, mcpResult.apply.data)
  }

  // Case 2: transactions array
  if (Array.isArray(mcpResult?.transactions)) {
    let receipt
    for (const tx of mcpResult.transactions) {
      receipt = await broadcast(tx.to, tx.data, tx.value || '0x0')
    }
    return receipt
  }

  // Case 3: single tx
  if (mcpResult?.to && mcpResult?.data) {
    return await broadcast(mcpResult.to, mcpResult.data, mcpResult.value || '0x0')
  }

  throw new Error(`Cannot parse tx from MCP result: ${raw.slice(0, 300)}`)
}

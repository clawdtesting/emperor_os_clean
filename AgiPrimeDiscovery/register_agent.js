import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const rpcUrl = process.env.ETH_RPC_URL?.trim() || 'https://eth.llamarpc.com'
const provider = new ethers.JsonRpcProvider(rpcUrl)
const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY?.trim(), provider)

console.log("Agent address:", wallet.address)
console.log("RPC URL:", rpcUrl)

const tx = await wallet.sendTransaction({
  to: "0x7811993cbcca3b8bb35a3d919f3ba59eefbeaa9a",
  data: "0xf2c298be00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000009656d7065726f726f730000000000000000000000000000000000000000000000",
  value: 0n,
})

console.log("Tx sent:", tx.hash)
console.log("Waiting for confirmation...")
const receipt = await tx.wait()
console.log("Confirmed in block:", receipt.blockNumber)
console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED")
console.log("Agent identity registered: emperoros.alpha.agent.agi.eth")

// save as check_auth.js in agi-agent/
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const rpcUrl = process.env.ETH_RPC_URL?.trim() || 'https://eth.llamarpc.com'
console.log("RPC URL:", rpcUrl)
const provider = new ethers.JsonRpcProvider(rpcUrl)

const CONTRACT1 = "0xB3AAeb69b630f0299791679c063d68d6687481d1";
const ABI = [
  "function additionalAgents(address) view returns (bool)",
  "function agentMerkleRoot() view returns (bytes32)",
  "function isAuthorizedAgent(address, string, bytes32[]) view returns (bool)"
];

const contract = new ethers.Contract(CONTRACT1, ABI, provider);
const agentAddress = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY?.trim()).address;

console.log("Agent address:", agentAddress);

// Check path 1
const isWhitelisted = await contract.additionalAgents(agentAddress);
console.log("additionalAgents whitelist:", isWhitelisted);

// Check path 3 — ENS (try with your subdomain)
const subdomain = process.env.AGENT_SUBDOMAIN?.trim() || "";
try {
  const isAuthorized = await contract.isAuthorizedAgent(agentAddress, subdomain, []);
  console.log("ENS authorized:", isAuthorized);
} catch(e) {
  console.log("ENS check failed:", e.message);
}

// Show current merkle root
const merkleRoot = await contract.agentMerkleRoot();
console.log("Current agentMerkleRoot:", merkleRoot);
console.log("Merkle root is empty:", merkleRoot === ethers.ZeroHash);

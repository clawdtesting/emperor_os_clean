// audits/lib/abi_utils.js
// ABI encoding/decoding and selector utilities.

import { ethers } from "ethers";

export function getSelector(data) {
  return String(data ?? "").slice(0, 10).toLowerCase();
}

export function decodeCalldata(abi, data) {
  try {
    const iface = new ethers.Interface(abi);
    return iface.parseTransaction({ data });
  } catch (err) {
    return null;
  }
}

export function encodeFunctionCall(abi, functionName, args) {
  try {
    const iface = new ethers.Interface(abi);
    return iface.encodeFunctionData(functionName, args);
  } catch (err) {
    return null;
  }
}

export function normalizeAddress(addr) {
  try {
    return ethers.getAddress(String(addr));
  } catch {
    return String(addr).toLowerCase();
  }
}

export function addressesMatch(a, b) {
  try {
    return ethers.getAddress(a) === ethers.getAddress(b);
  } catch {
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
}

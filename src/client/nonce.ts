import type { RpcProvider } from 'starknet'

/**
 * Read the on-chain nonce for an address from the Stela contract.
 *
 * Uses 'latest' block — Cartridge RPC does not support 'pending'.
 * All nonce reads (frontend, server verify, API route) MUST use the same
 * block tag. The server-side processCreateOrder has a grace window to
 * account for nonces consumed in recent blocks not yet in 'latest'.
 */
export async function getNonce(
  provider: RpcProvider,
  stelaAddress: string,
  accountAddress: string,
): Promise<bigint> {
  const result = await provider.callContract(
    {
      contractAddress: stelaAddress,
      entrypoint: 'nonces',
      calldata: [accountAddress],
    },
    'latest',
  )
  return BigInt(result[0])
}

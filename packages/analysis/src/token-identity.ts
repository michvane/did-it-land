import type { SolanaCluster, TokenIdentity } from "./types";

const MAINNET_TOKENS: Record<string, Omit<TokenIdentity, "source">> = {
  So11111111111111111111111111111111111111112: { symbol: "wSOL", name: "Wrapped SOL" },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", name: "USD Coin" },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: "USDT", name: "Tether USD" },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: "JUP", name: "Jupiter" },
};

export function resolveTokenIdentity(
  mint: string | undefined,
  cluster: SolanaCluster,
): TokenIdentity | undefined {
  if (!mint || cluster !== "mainnet-beta") return undefined;
  const token = MAINNET_TOKENS[mint];
  return token ? { ...token, source: "curated_registry" } : undefined;
}

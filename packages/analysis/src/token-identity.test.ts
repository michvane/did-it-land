import { describe, expect, it } from "vitest";
import { resolveTokenIdentity } from "./token-identity";

describe("token identity", () => {
  it("identifies curated mainnet tokens", () => {
    expect(resolveTokenIdentity(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "mainnet-beta",
    )).toEqual({
      symbol: "USDC",
      name: "USD Coin",
      source: "curated_registry",
    });
  });

  it("does not apply mainnet identities to another cluster", () => {
    expect(resolveTokenIdentity(
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "devnet",
    )).toBeUndefined();
  });
});

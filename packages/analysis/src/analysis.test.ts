import type { ParsedTransactionWithMeta, SignatureStatus } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { formatUnits, parseUnits } from "./format";
import { interpretTransaction } from "./interpret";
import { normalizeSignature } from "./signature";

const signature = "5KtPn3Q2zR9WwssAb28wRLx5m2r3VsZTb5ccsE2VqVPpS8eWTTpQn2HQ1eY7fgQX2MjHL4Cw8rjTzpQcY5Gf8FjN";
const sender = "8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu";
const recipient = "GsbwXfJraMomNxBcjPn2P2rMZkQqRh8GXqCZv7S4vPNT";

function successfulTransfer(): ParsedTransactionWithMeta {
  return {
    blockTime: 1_725_000_000,
    slot: 300_000_000,
    meta: {
      computeUnitsConsumed: 150,
      costUnits: 180,
      err: null,
      fee: 5_000,
      innerInstructions: [],
      loadedAddresses: { readonly: [], writable: [] },
      logMessages: ["Program 11111111111111111111111111111111 success"],
      postBalances: [1_499_995_000, 500_000_000],
      postTokenBalances: [],
      preBalances: [2_000_000_000, 0],
      preTokenBalances: [],
      rewards: [],
      status: { Ok: null },
    },
    transaction: {
      message: {
        accountKeys: [
          { pubkey: sender, signer: true, source: "transaction", writable: true },
          { pubkey: recipient, signer: false, source: "transaction", writable: true },
        ],
        instructions: [
          {
            parsed: {
              type: "transfer",
              info: { source: sender, destination: recipient, lamports: 500_000_000 },
            },
            program: "system",
            programId: "11111111111111111111111111111111",
            stackHeight: null,
          },
        ],
        recentBlockhash: "Eit7Y8pYJodA9avT8yYFZ2NzQ4LhpTnGcaT5Qz8PZqvu",
      },
      signatures: [signature],
    },
    version: "legacy",
  } as unknown as ParsedTransactionWithMeta;
}

const finalizedStatus: SignatureStatus = {
  confirmationStatus: "finalized",
  confirmations: null,
  err: null,
  slot: 300_000_000,
};

describe("amount formatting", () => {
  it("converts exact decimal values without floating point math", () => {
    expect(parseUnits("0.5", 9)).toBe(500_000_000n);
    expect(formatUnits(500_000_000n, 9)).toBe("0.5");
    expect(formatUnits(-5_000n, 9)).toBe("-0.000005");
  });
});

describe("signature normalization", () => {
  it("accepts a direct signature and explorer URL", () => {
    expect(normalizeSignature(signature)).toBe(signature);
    expect(normalizeSignature(`https://explorer.solana.com/tx/${signature}?cluster=devnet`)).toBe(signature);
  });

  it("rejects malformed signatures", () => {
    expect(() => normalizeSignature("not-a-signature")).toThrow(/valid Solana transaction signature/);
  });
});

describe("transaction interpretation", () => {
  it("verifies an exact SOL transfer", () => {
    const result = interpretTransaction({
      signature,
      cluster: "mainnet-beta",
      status: finalizedStatus,
      transaction: successfulTransfer(),
      expectation: {
        recipient,
        amount: "0.5",
        mint: "SOL",
      },
    });

    expect(result.state).toBe("succeeded");
    expect(result.confirmation).toBe("finalized");
    expect(result.expectation.overall).toBe("matched");
    expect(result.diagnosis.code).toBe("TRANSFER_VERIFIED");
    expect(result.nativeTransfers[0]?.amount).toBe("0.5");
  });

  it("flags a recipient mismatch without treating the transaction as failed", () => {
    const result = interpretTransaction({
      signature,
      cluster: "mainnet-beta",
      status: finalizedStatus,
      transaction: successfulTransfer(),
      expectation: {
        recipient: sender,
        amount: "0.5",
        mint: "SOL",
      },
    });

    expect(result.state).toBe("succeeded");
    expect(result.expectation.recipient.state).toBe("mismatched");
    expect(result.diagnosis.code).toBe("EXPECTATION_MISMATCH");
  });
});

import { PublicKey } from "@solana/web3.js";
import { parseUnits, solToLamports } from "./format";
import type {
  CheckState,
  ExpectationCheck,
  ExpectationResult,
  NativeTransfer,
  TokenBalanceChange,
  TokenTransfer,
  TransactionExpectation,
} from "./types";

interface TransferEvidence {
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
  tokenBalanceChanges: TokenBalanceChange[];
}

const unchecked = (detail: string): ExpectationCheck => ({
  state: "not_checked",
  detail,
});

function combine(states: CheckState[]): CheckState {
  const checked = states.filter((state) => state !== "not_checked");
  if (checked.length === 0) return "not_checked";
  if (checked.includes("mismatched")) return "mismatched";
  if (checked.includes("unverifiable")) return "unverifiable";
  return "matched";
}

export function validateExpectation(expectation?: TransactionExpectation): TransactionExpectation | undefined {
  if (!expectation) return undefined;

  const cleaned: TransactionExpectation = {};

  if (expectation.recipient?.trim()) {
    try {
      cleaned.recipient = new PublicKey(expectation.recipient.trim()).toBase58();
    } catch {
      throw new Error("The expected recipient is not a valid Solana address.");
    }
  }

  if (expectation.mint?.trim() && expectation.mint.toUpperCase() !== "SOL") {
    try {
      cleaned.mint = new PublicKey(expectation.mint.trim()).toBase58();
    } catch {
      throw new Error("The expected token mint is not a valid Solana address.");
    }
  } else if (expectation.mint?.trim()) {
    cleaned.mint = "SOL";
  }

  if (expectation.amount?.trim()) {
    if (!/^\d+(?:\.\d+)?$/.test(expectation.amount.trim()) || Number(expectation.amount) <= 0) {
      throw new Error("The expected amount must be greater than zero.");
    }
    cleaned.amount = expectation.amount.trim();
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function evaluateExpectation(
  expectation: TransactionExpectation | undefined,
  evidence: TransferEvidence,
): ExpectationResult {
  if (!expectation) {
    return {
      overall: "not_checked",
      recipient: unchecked("No expected recipient was provided."),
      amount: unchecked("No expected amount was provided."),
      asset: unchecked("No expected asset was provided."),
    };
  }

  const expectsSol = !expectation.mint || expectation.mint === "SOL";
  const relevantNative = expectsSol ? evidence.nativeTransfers : [];
  const relevantTokens = expectsSol
    ? []
    : evidence.tokenTransfers.filter((transfer) => transfer.mint === expectation.mint);

  let recipient = unchecked("No expected recipient was provided.");
  if (expectation.recipient) {
    const nativeMatch = relevantNative.some(
      (transfer) => transfer.destination === expectation.recipient,
    );
    const tokenMatch = relevantTokens.some(
      (transfer) => transfer.destinationOwner === expectation.recipient,
    );
    const balanceMatch = evidence.tokenBalanceChanges.some(
      (change) =>
        change.owner === expectation.recipient &&
        change.mint === expectation.mint &&
        BigInt(change.rawAmount) > 0n,
    );
    const matched = nativeMatch || tokenMatch || balanceMatch;
    const actualRecipients = expectsSol
      ? relevantNative.map((transfer) => transfer.destination)
      : relevantTokens
          .map((transfer) => transfer.destinationOwner)
          .filter((owner): owner is string => Boolean(owner));

    recipient = {
      state: matched ? "matched" : "mismatched",
      expected: expectation.recipient,
      actual: [...new Set(actualRecipients)].join(", ") || undefined,
      detail: matched
        ? "The expected recipient appears in the verified transfer evidence."
        : "The expected recipient was not found in the verified transfer evidence.",
    };
  }

  let asset = unchecked("No token mint was provided; SOL is assumed for amount checks.");
  if (expectation.mint) {
    const matched = expectsSol
      ? relevantNative.length > 0
      : relevantTokens.length > 0 ||
        evidence.tokenBalanceChanges.some((change) => change.mint === expectation.mint);
    asset = {
      state: matched ? "matched" : "mismatched",
      expected: expectation.mint,
      actual: matched ? expectation.mint : undefined,
      detail: matched
        ? "The expected asset appears in the transaction."
        : "The expected asset was not found in the transaction.",
    };
  }

  let amount = unchecked("No expected amount was provided.");
  if (expectation.amount) {
    if (expectsSol) {
      const expectedRaw = solToLamports(expectation.amount);
      const candidates = expectation.recipient
        ? relevantNative.filter((transfer) => transfer.destination === expectation.recipient)
        : relevantNative;
      const matchedTransfer = candidates.find(
        (transfer) => BigInt(transfer.lamports) === expectedRaw,
      );
      amount = {
        state: matchedTransfer ? "matched" : "mismatched",
        expected: `${expectation.amount} SOL`,
        actual: candidates.map((transfer) => `${transfer.amount} SOL`).join(", ") || undefined,
        detail: matchedTransfer
          ? "The exact expected SOL amount was transferred."
          : "The exact expected SOL amount was not found.",
      };
    } else {
      const candidates = expectation.recipient
        ? relevantTokens.filter((transfer) => transfer.destinationOwner === expectation.recipient)
        : relevantTokens;
      const comparable = candidates.filter(
        (transfer): transfer is TokenTransfer & { decimals: number } =>
          typeof transfer.decimals === "number",
      );

      if (comparable.length === 0) {
        amount = {
          state: "unverifiable",
          expected: expectation.amount,
          detail: "The token transfer was found, but its decimals could not be resolved.",
        };
      } else {
        const matchedTransfer = comparable.find(
          (transfer) =>
            BigInt(transfer.rawAmount) === parseUnits(expectation.amount!, transfer.decimals),
        );
        amount = {
          state: matchedTransfer ? "matched" : "mismatched",
          expected: expectation.amount,
          actual: comparable.map((transfer) => transfer.amount ?? transfer.rawAmount).join(", "),
          detail: matchedTransfer
            ? "The exact expected token amount was transferred."
            : "The exact expected token amount was not found.",
        };
      }
    }
  }

  return {
    overall: combine([recipient.state, amount.state, asset.state]),
    recipient,
    amount,
    asset,
  };
}

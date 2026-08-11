import type {
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
  SignatureStatus,
} from "@solana/web3.js";
import { evaluateExpectation } from "./expectation";
import { formatSol, formatUnits } from "./format";
import { resolveProgramError } from "./program-errors";
import { resolveTokenIdentity } from "./token-identity";
import type {
  ConfirmationState,
  Diagnosis,
  FailureDetails,
  NativeBalanceChange,
  NativeTransfer,
  SolanaCluster,
  TokenBalanceChange,
  TokenTransfer,
  TransactionAnalysis,
  TransactionExpectation,
} from "./types";

type AnyInstruction = ParsedInstruction | PartiallyDecodedInstruction;

interface InterpretInput {
  signature: string;
  cluster: SolanaCluster;
  status: SignatureStatus | null;
  transaction: ParsedTransactionWithMeta | null;
  expectation?: TransactionExpectation;
}

function accountAddress(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toBase58" in value) {
    return (value as { toBase58(): string }).toBase58();
  }
  return String(value);
}

function flattenInstructions(transaction: ParsedTransactionWithMeta): AnyInstruction[] {
  const topLevel = transaction.transaction.message.instructions;
  const inner = transaction.meta?.innerInstructions?.flatMap((group) => group.instructions) ?? [];
  return [...topLevel, ...inner];
}

function tokenAccountMetadata(transaction: ParsedTransactionWithMeta) {
  const keys = transaction.transaction.message.accountKeys.map((key) => accountAddress(key.pubkey));
  const result = new Map<string, { owner?: string; mint: string; decimals: number }>();
  const balances = [
    ...(transaction.meta?.preTokenBalances ?? []),
    ...(transaction.meta?.postTokenBalances ?? []),
  ];

  for (const balance of balances) {
    const address = keys[balance.accountIndex];
    if (!address) continue;
    result.set(address, {
      owner: balance.owner,
      mint: balance.mint,
      decimals: balance.uiTokenAmount.decimals,
    });
  }

  return result;
}

function extractTransfers(transaction: ParsedTransactionWithMeta) {
  const tokenMetadata = tokenAccountMetadata(transaction);
  const nativeTransfers: NativeTransfer[] = [];
  const tokenTransfers: TokenTransfer[] = [];

  for (const instruction of flattenInstructions(transaction)) {
    if (!("parsed" in instruction) || !instruction.parsed || typeof instruction.parsed !== "object") {
      continue;
    }

    const parsed = instruction.parsed as {
      type?: string;
      info?: Record<string, unknown>;
    };
    const info = parsed.info ?? {};

    if (
      instruction.program === "system" &&
      parsed.type === "transfer" &&
      typeof info.source === "string" &&
      typeof info.destination === "string" &&
      (typeof info.lamports === "number" || typeof info.lamports === "string")
    ) {
      const lamports = BigInt(info.lamports);
      nativeTransfers.push({
        source: info.source,
        destination: info.destination,
        lamports: lamports.toString(),
        amount: formatSol(lamports),
      });
    }

    if (
      (instruction.program === "spl-token" || instruction.program === "spl-token-2022") &&
      (parsed.type === "transfer" || parsed.type === "transferChecked") &&
      typeof info.source === "string" &&
      typeof info.destination === "string"
    ) {
      const source = tokenMetadata.get(info.source);
      const destination = tokenMetadata.get(info.destination);
      const checkedAmount = info.tokenAmount as
        | { amount?: string; decimals?: number; uiAmountString?: string }
        | undefined;
      const rawAmount = checkedAmount?.amount ??
        (typeof info.amount === "string" || typeof info.amount === "number"
          ? String(info.amount)
          : "0");
      const decimals = checkedAmount?.decimals ?? source?.decimals ?? destination?.decimals;

      tokenTransfers.push({
        sourceTokenAccount: info.source,
        destinationTokenAccount: info.destination,
        sourceOwner: source?.owner,
        destinationOwner: destination?.owner,
        mint: typeof info.mint === "string" ? info.mint : source?.mint ?? destination?.mint,
        rawAmount,
        decimals,
        amount:
          checkedAmount?.uiAmountString ??
          (typeof decimals === "number" ? formatUnits(BigInt(rawAmount), decimals) : undefined),
      });
    }
  }

  return { nativeTransfers, tokenTransfers };
}

function nativeBalanceChanges(transaction: ParsedTransactionWithMeta): NativeBalanceChange[] {
  const meta = transaction.meta;
  if (!meta) return [];

  return transaction.transaction.message.accountKeys.flatMap((key, index) => {
    const pre = meta.preBalances[index];
    const post = meta.postBalances[index];
    if (pre === undefined || post === undefined || pre === post) return [];
    const change = BigInt(post) - BigInt(pre);
    return [{
      address: accountAddress(key.pubkey),
      lamports: change.toString(),
      amount: formatSol(change),
    }];
  });
}

function tokenBalanceChanges(transaction: ParsedTransactionWithMeta): TokenBalanceChange[] {
  const meta = transaction.meta;
  if (!meta) return [];

  const keys = transaction.transaction.message.accountKeys.map((key) => accountAddress(key.pubkey));
  const totals = new Map<string, { owner: string; mint: string; decimals: number; pre: bigint; post: bigint }>();

  const add = (side: "pre" | "post", balance: NonNullable<typeof meta.preTokenBalances>[number]) => {
    const owner = balance.owner ?? keys[balance.accountIndex];
    if (!owner) return;
    const mapKey = `${owner}:${balance.mint}`;
    const existing = totals.get(mapKey) ?? {
      owner,
      mint: balance.mint,
      decimals: balance.uiTokenAmount.decimals,
      pre: 0n,
      post: 0n,
    };
    existing[side] += BigInt(balance.uiTokenAmount.amount);
    totals.set(mapKey, existing);
  };

  for (const balance of meta.preTokenBalances ?? []) add("pre", balance);
  for (const balance of meta.postTokenBalances ?? []) add("post", balance);

  return [...totals.values()].flatMap((balance) => {
    const change = balance.post - balance.pre;
    if (change === 0n) return [];
    return [{
      owner: balance.owner,
      mint: balance.mint,
      rawAmount: change.toString(),
      decimals: balance.decimals,
      amount: formatUnits(change, balance.decimals),
    }];
  });
}

function confirmationState(status: SignatureStatus | null): ConfirmationState {
  return status?.confirmationStatus ?? "unknown";
}

function instructionFailure(rawError: unknown): {
  index?: number;
  error?: unknown;
} {
  if (!rawError || typeof rawError !== "object" || !("InstructionError" in rawError)) return {};
  const instructionError = (rawError as { InstructionError?: unknown }).InstructionError;
  if (!Array.isArray(instructionError)) return {};
  return {
    index: typeof instructionError[0] === "number" ? instructionError[0] : undefined,
    error: instructionError[1],
  };
}

function failureDetails(
  transaction: ParsedTransactionWithMeta,
  rawError: unknown,
  logs: string[],
): FailureDetails {
  const instruction = instructionFailure(rawError);
  const topLevel = typeof instruction.index === "number"
    ? transaction.transaction.message.instructions[instruction.index]
    : undefined;
  const failedLog = [...logs].reverse().find((log) => /^Program \S+ failed:/.test(log));
  const logMatch = failedLog?.match(/^Program (\S+) failed: (.+)$/);
  const customCode = instruction.error && typeof instruction.error === "object" && "Custom" in instruction.error
    && typeof (instruction.error as { Custom?: unknown }).Custom === "number"
    ? (instruction.error as { Custom: number }).Custom
    : undefined;
  const rawLabel = typeof instruction.error === "string"
    ? instruction.error.replace(/([a-z])([A-Z])/g, "$1 $2")
    : logMatch?.[2] ?? "The program rejected an instruction";

  const programId = topLevel ? accountAddress(topLevel.programId) : logMatch?.[1];
  const errorCode = customCode?.toString();
  const errorLabel = customCode !== undefined ? `Custom program error ${customCode}` : rawLabel;

  return {
    instructionIndex: instruction.index,
    programId,
    errorCode,
    errorLabel,
    resolution: resolveProgramError({ programId, errorCode, fallbackLabel: errorLabel, logs }),
    changesRolledBack: true,
  };
}

function failureDiagnosis(
  rawError: unknown,
  logs: string[],
  failure: FailureDetails,
): Diagnosis {
  const evidence = `${JSON.stringify(rawError)} ${logs.join(" ")}`.toLowerCase();

  if (evidence.includes("insufficient funds")) {
    return {
      code: "INSUFFICIENT_FUNDS",
      headline: "The transaction failed before completing",
      summary: "The transaction did not have enough funds for the requested action. Its state changes were rolled back.",
      nextStep: "Check the fee payer's SOL balance and the amount available for the asset being sent, then rebuild the transaction.",
    };
  }

  if (evidence.includes("slippage")) {
    return {
      code: "SLIPPAGE_EXCEEDED",
      headline: "The swap price moved too far",
      summary: "The transaction failed because the available execution price fell outside the allowed slippage. The swap itself did not complete.",
      nextStep: "Request a fresh quote. Only increase slippage after reviewing the price impact.",
    };
  }

  if (
    evidence.includes("computational budget exceeded") ||
    /compute(?: unit| budget)[^.;]*exceeded/.test(evidence)
  ) {
    return {
      code: "COMPUTE_LIMIT_EXCEEDED",
      headline: "The transaction ran out of compute budget",
      summary: "A program needed more compute units than the transaction allowed, so its state changes were rolled back.",
      nextStep: "Retry through the originating app. The app may need to rebuild the transaction with a larger compute budget.",
    };
  }

  return {
    code: "TRANSACTION_FAILED",
    headline: "The transaction failed",
    summary: failure.resolution.source === "unknown" && failure.errorCode && failure.instructionIndex !== undefined
      ? `The program rejected instruction ${failure.instructionIndex + 1} with error code ${failure.errorCode}. ${failure.resolution.message}`
      : failure.instructionIndex !== undefined
        ? `Instruction ${failure.instructionIndex + 1} failed: ${failure.resolution.message}`
        : `${failure.resolution.message} All attempted state changes were rolled back.`,
    nextStep: "Retry through the original app or share the program and error details below with its support team.",
  };
}

function explorerUrl(signature: string, cluster: SolanaCluster): string {
  const query = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${query}`;
}

export function notFoundAnalysis(
  signature: string,
  cluster: SolanaCluster,
  expectation?: TransactionExpectation,
): TransactionAnalysis {
  return {
    signature,
    cluster,
    state: "not_found",
    confirmation: "unknown",
    nativeTransfers: [],
    tokenTransfers: [],
    nativeBalanceChanges: [],
    tokenBalanceChanges: [],
    expectation: evaluateExpectation(expectation, {
      nativeTransfers: [],
      tokenTransfers: [],
      tokenBalanceChanges: [],
    }),
    diagnosis: {
      code: "TRANSACTION_NOT_FOUND",
      headline: "No transaction was found",
      summary: "The selected Solana cluster does not currently return a transaction for this signature. It may never have been broadcast, may have been dropped, or may belong to another cluster.",
      nextStep: "Confirm the network and signature with the sending wallet or exchange. If it supplied no signature, the transaction was not submitted to Solana.",
    },
    logs: [],
    limitations: [
      "A missing result cannot distinguish a dropped transaction from a signature that belongs to another RPC history window.",
    ],
    explorerUrl: explorerUrl(signature, cluster),
  };
}

export function interpretTransaction(input: InterpretInput): TransactionAnalysis {
  if (!input.transaction) {
    return notFoundAnalysis(input.signature, input.cluster, input.expectation);
  }

  const transaction = input.transaction;
  const meta = transaction.meta;
  const failed = Boolean(meta?.err ?? input.status?.err);
  const logs = meta?.logMessages ?? [];
  const rawError = meta?.err ?? input.status?.err;
  const extractedTransfers = extractTransfers(transaction);
  const transfers = {
    nativeTransfers: extractedTransfers.nativeTransfers,
    tokenTransfers: extractedTransfers.tokenTransfers.map((transfer) => ({
      ...transfer,
      identity: resolveTokenIdentity(transfer.mint, input.cluster),
    })),
  };
  const tokenChanges = tokenBalanceChanges(transaction).map((change) => ({
    ...change,
    identity: resolveTokenIdentity(change.mint, input.cluster),
  }));
  const expectation = evaluateExpectation(input.expectation, failed
    ? { nativeTransfers: [], tokenTransfers: [], tokenBalanceChanges: [] }
    : { ...transfers, tokenBalanceChanges: tokenChanges });
  const failure = failed ? failureDetails(transaction, rawError, logs) : undefined;

  let diagnosis: Diagnosis;
  if (failed && failure) {
    diagnosis = failureDiagnosis(rawError, logs, failure);
  } else if (expectation.overall === "mismatched") {
    diagnosis = {
      code: "EXPECTATION_MISMATCH",
      headline: "The transaction succeeded, but the expectation did not match",
      summary: "Solana finalized the transaction, but at least one expected recipient, asset, or amount was not found in the verified evidence.",
      nextStep: "Compare the actual transfer details below with the destination and amount you intended. Finalized transfers cannot be reversed.",
    };
  } else if (expectation.overall === "matched") {
    diagnosis = {
      code: "TRANSFER_VERIFIED",
      headline: "It landed exactly as expected",
      summary: "The transaction succeeded on Solana and the checked recipient, asset, and amount match the on-chain evidence.",
      nextStep: "If a wallet or exchange still does not show the funds, share the support summary with that provider so it can investigate its indexing or crediting system.",
    };
  } else {
    diagnosis = {
      code: "TRANSACTION_SUCCEEDED",
      headline: "The transaction succeeded",
      summary: "Solana recorded the transaction without an on-chain error. Add expected transfer details to verify the recipient and amount as well.",
      nextStep: "Review the detected transfers below or add an expected recipient and amount for a stricter check.",
    };
  }

  return {
    signature: input.signature,
    cluster: input.cluster,
    state: failed ? "failed" : "succeeded",
    confirmation: confirmationState(input.status),
    slot: transaction.slot,
    blockTime: transaction.blockTime ?? undefined,
    feeLamports: meta?.fee.toString(),
    feePayer: transaction.transaction.message.accountKeys[0]
      ? accountAddress(transaction.transaction.message.accountKeys[0].pubkey)
      : undefined,
    nativeTransfers: transfers.nativeTransfers,
    tokenTransfers: transfers.tokenTransfers,
    nativeBalanceChanges: nativeBalanceChanges(transaction),
    tokenBalanceChanges: tokenChanges,
    expectation,
    diagnosis,
    failure,
    rawError: rawError ?? undefined,
    logs,
    limitations: [
      "Balance changes can include account creation, rent, swaps, and multiple instructions—not only a single transfer.",
      "Unknown programs may not expose human-readable instruction details through standard parsed RPC responses.",
    ],
    explorerUrl: explorerUrl(input.signature, input.cluster),
  };
}

export type SolanaCluster = "mainnet-beta" | "devnet" | "testnet";

export interface TransactionExpectation {
  recipient?: string;
  amount?: string;
  mint?: string;
}

export interface AnalyzeTransactionInput {
  signature: string;
  cluster?: SolanaCluster;
  expectation?: TransactionExpectation;
  rpcUrl?: string;
}

export type VerificationState = "succeeded" | "failed" | "not_found";

export type ConfirmationState =
  | "processed"
  | "confirmed"
  | "finalized"
  | "unknown";

export interface NativeTransfer {
  source: string;
  destination: string;
  lamports: string;
  amount: string;
}

export interface TokenTransfer {
  sourceTokenAccount: string;
  destinationTokenAccount: string;
  sourceOwner?: string;
  destinationOwner?: string;
  mint?: string;
  rawAmount: string;
  decimals?: number;
  amount?: string;
}

export interface NativeBalanceChange {
  address: string;
  lamports: string;
  amount: string;
}

export interface TokenBalanceChange {
  owner: string;
  mint: string;
  rawAmount: string;
  decimals: number;
  amount: string;
}

export type CheckState = "matched" | "mismatched" | "not_checked" | "unverifiable";

export interface ExpectationCheck {
  state: CheckState;
  expected?: string;
  actual?: string;
  detail: string;
}

export interface ExpectationResult {
  overall: CheckState;
  recipient: ExpectationCheck;
  amount: ExpectationCheck;
  asset: ExpectationCheck;
}

export type DiagnosisCode =
  | "TRANSFER_VERIFIED"
  | "TRANSACTION_SUCCEEDED"
  | "EXPECTATION_MISMATCH"
  | "TRANSACTION_FAILED"
  | "INSUFFICIENT_FUNDS"
  | "SLIPPAGE_EXCEEDED"
  | "COMPUTE_LIMIT_EXCEEDED"
  | "TRANSACTION_NOT_FOUND";

export interface Diagnosis {
  code: DiagnosisCode;
  headline: string;
  summary: string;
  nextStep: string;
}

export interface FailureDetails {
  instructionIndex?: number;
  programId?: string;
  errorCode?: string;
  errorLabel: string;
  changesRolledBack: true;
}

export interface TransactionAnalysis {
  signature: string;
  cluster: SolanaCluster;
  state: VerificationState;
  confirmation: ConfirmationState;
  slot?: number;
  blockTime?: number;
  feeLamports?: string;
  feePayer?: string;
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
  nativeBalanceChanges: NativeBalanceChange[];
  tokenBalanceChanges: TokenBalanceChange[];
  expectation: ExpectationResult;
  diagnosis: Diagnosis;
  failure?: FailureDetails;
  rawError?: unknown;
  logs: string[];
  limitations: string[];
  explorerUrl: string;
}

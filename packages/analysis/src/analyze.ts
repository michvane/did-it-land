import { clusterApiUrl, Connection } from "@solana/web3.js";
import { validateExpectation } from "./expectation";
import { interpretTransaction, notFoundAnalysis } from "./interpret";
import { normalizeSignature } from "./signature";
import type { AnalyzeTransactionInput, TransactionAnalysis } from "./types";

export async function analyzeTransaction(
  input: AnalyzeTransactionInput,
): Promise<TransactionAnalysis> {
  const signature = normalizeSignature(input.signature);
  const cluster = input.cluster ?? "mainnet-beta";
  const expectation = validateExpectation(input.expectation);
  const connection = new Connection(input.rpcUrl ?? clusterApiUrl(cluster), "confirmed");

  const [statusResponse, transaction] = await Promise.all([
    connection.getSignatureStatuses([signature], { searchTransactionHistory: true }),
    connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    }),
  ]);

  const status = statusResponse.value[0] ?? null;
  if (!status && !transaction) {
    return notFoundAnalysis(signature, cluster, expectation);
  }

  return interpretTransaction({
    signature,
    cluster,
    status,
    transaction,
    expectation,
  });
}

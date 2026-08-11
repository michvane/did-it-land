import type { AnalyzeTransactionInput, TransactionAnalysis } from "@did-it-land/analysis";

export async function verifyTransaction(
  input: AnalyzeTransactionInput,
): Promise<TransactionAnalysis> {
  const response = await fetch("/api/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json() as {
    analysis?: TransactionAnalysis;
    error?: string;
  };

  if (!response.ok || !body.analysis) {
    throw new Error(body.error ?? "The verification service is unavailable.");
  }

  return body.analysis;
}

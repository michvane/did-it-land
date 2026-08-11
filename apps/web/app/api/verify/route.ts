import { analyzeTransaction, type AnalyzeTransactionInput } from "@did-it-land/analysis";

export const runtime = "nodejs";
export const maxDuration = 30;

function isAnalyzeInput(value: unknown): value is AnalyzeTransactionInput {
  return Boolean(value && typeof value === "object" && typeof (value as AnalyzeTransactionInput).signature === "string");
}

export async function POST(request: Request) {
  try {
    const input: unknown = await request.json();
    if (!isAnalyzeInput(input)) {
      return Response.json({ error: "A transaction signature is required." }, { status: 400 });
    }

    const analysis = await analyzeTransaction({
      ...input,
      rpcUrl: process.env.SOLANA_RPC_URL || input.rpcUrl,
    });
    return Response.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    const status = /valid|enter|required|amount|recipient|mint/i.test(message) ? 400 : 502;
    return Response.json({ error: message }, { status });
  }
}

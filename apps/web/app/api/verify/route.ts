import {
  analyzeTransaction,
  type AnalyzeTransactionInput,
  type SolanaCluster,
  type TransactionExpectation,
} from "@did-it-land/analysis";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 16_384;
const CLUSTERS = new Set<SolanaCluster>(["mainnet-beta", "devnet", "testnet"]);

class InputError extends Error {}

function optionalString(
  value: unknown,
  name: string,
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new InputError(`${name} is invalid.`);
  }
  return value || undefined;
}

function parseExpectation(value: unknown): TransactionExpectation | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError("Expected outcome is invalid.");
  }

  const expectation = value as Record<string, unknown>;
  return {
    recipient: optionalString(expectation.recipient, "Expected recipient", 128),
    amount: optionalString(expectation.amount, "Expected amount", 64),
    mint: optionalString(expectation.mint, "Expected asset", 128),
  };
}

function parseInput(value: unknown): AnalyzeTransactionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError("A transaction signature is required.");
  }

  const input = value as Record<string, unknown>;
  if (typeof input.signature !== "string" || !input.signature.trim() || input.signature.length > 512) {
    throw new InputError("A valid transaction signature is required.");
  }

  const cluster = input.cluster ?? "mainnet-beta";
  if (typeof cluster !== "string" || !CLUSTERS.has(cluster as SolanaCluster)) {
    throw new InputError("Network is invalid.");
  }

  return {
    signature: input.signature,
    cluster: cluster as SolanaCluster,
    expectation: parseExpectation(input.expectation),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return Response.json({ error: "Request is too large." }, { status: 413 });
    }

    const input = parseInput(JSON.parse(body || "{}"));
    const analysis = await analyzeTransaction({
      ...input,
      rpcUrl: process.env.SOLANA_RPC_URL || undefined,
    });

    return Response.json(
      { analysis },
      { headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } },
    );
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) {
      return Response.json(
        { error: error instanceof InputError ? error.message : "Request body is invalid." },
        { status: 400 },
      );
    }

    const name = error instanceof Error ? error.name : "UnknownError";
    console.error("verify_transaction_failed", { name });
    return Response.json({ error: "The Solana RPC service is temporarily unavailable." }, { status: 502 });
  }
}

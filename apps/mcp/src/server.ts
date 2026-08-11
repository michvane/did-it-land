import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  analyzeTransaction,
  createSupportSummary,
  type AnalyzeTransactionInput,
  type TransactionAnalysis,
} from "@did-it-land/analysis";
import { z } from "zod";

type Analyzer = (input: AnalyzeTransactionInput) => Promise<TransactionAnalysis>;

export function createDidItLandServer(analyzer: Analyzer = analyzeTransaction): McpServer {
  const server = new McpServer(
    { name: "did-it-land", version: "0.1.0" },
    {
      instructions:
        "Use verify_solana_transaction to determine what Solana recorded. Treat its structured result as evidence. Never infer that a missing transaction succeeded, and never request a seed phrase or private key.",
    },
  );

  server.registerTool(
    "verify_solana_transaction",
    {
      title: "Verify a Solana transaction",
      description:
        "Checks a Solana transaction signature and returns deterministic evidence about chain status, transfers, fees, errors, and optional expected recipient/amount/asset matches. Read-only: it never connects to a wallet or signs anything.",
      inputSchema: {
        signature: z.string().describe("Solana transaction signature or explorer URL"),
        cluster: z
          .enum(["mainnet-beta", "devnet", "testnet"])
          .default("mainnet-beta")
          .describe("Solana cluster containing the transaction"),
        expectedRecipient: z
          .string()
          .optional()
          .describe("Optional Solana address that should have received the transfer"),
        expectedAmount: z
          .string()
          .optional()
          .describe("Optional exact decimal amount, provided as a string to preserve precision"),
        expectedMint: z
          .string()
          .optional()
          .describe("SOL or the expected SPL token mint address"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ signature, cluster, expectedRecipient, expectedAmount, expectedMint }) => {
      try {
        const analysis = await analyzer({
          signature,
          cluster,
          rpcUrl: process.env.SOLANA_RPC_URL,
          expectation:
            expectedRecipient || expectedAmount || expectedMint
              ? {
                  recipient: expectedRecipient,
                  amount: expectedAmount,
                  mint: expectedMint,
                }
              : undefined,
        });

        return {
          content: [{ type: "text", text: createSupportSummary(analysis) }],
          structuredContent: {
            analysis: JSON.parse(JSON.stringify(analysis)) as Record<string, unknown>,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Transaction verification failed.";
        return {
          isError: true,
          content: [{ type: "text", text: message }],
        };
      }
    },
  );

  return server;
}

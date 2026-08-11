import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { notFoundAnalysis } from "@did-it-land/analysis";
import { createDidItLandServer } from "./server";

describe("Did It Land MCP server", () => {
  it("exposes a read-only verification tool with structured evidence", async () => {
    const analyzer = async () => notFoundAnalysis(
      "5KtPn3Q2zR9WwssAb28wRLx5m2r3VsZTb5ccsE2VqVPpS8eWTTpQn2HQ1eY7fgQX2MjHL4Cw8rjTzpQcY5Gf8FjN",
      "mainnet-beta",
    );
    const server = createDidItLandServer(analyzer);
    const client = new Client({ name: "test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("verify_solana_transaction");

    const result = await client.callTool({
      name: "verify_solana_transaction",
      arguments: {
        signature: "5KtPn3Q2zR9WwssAb28wRLx5m2r3VsZTb5ccsE2VqVPpS8eWTTpQn2HQ1eY7fgQX2MjHL4Cw8rjTzpQcY5Gf8FjN",
      },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toMatchObject({
      analysis: { state: "not_found" },
    });

    await client.close();
    await server.close();
  });
});

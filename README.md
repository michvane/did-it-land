# Did It Land?

A plain-language receipt for Solana transactions. Paste a signature to see whether it succeeded, what moved, and whether it matched an expected recipient, amount, or asset.

Did It Land? reads public chain data only. It never connects a wallet, requests a private key, or signs a transaction.

**Live:** [did-it-land.vercel.app](https://did-it-land.vercel.app)

## What it checks

- Confirmation and execution status
- Native SOL and parsed SPL token transfers
- Network fee, fee payer, slot, and timestamp
- Common failures such as insufficient funds and slippage
- Optional recipient, amount, and asset expectations
- A compact support report for sharing or copying

The verdict is deterministic. It comes from Solana RPC evidence rather than an AI-generated score.

## Architecture

```text
Next.js web app
├── /                    interactive verifier
├── /api/verify          server-side RPC route
└── /tx/[signature]      shareable server-rendered receipt
          │
          ▼
@did-it-land/analysis    shared deterministic engine
          │
          ├── Solana RPC
          └── MCP server
```

The shared TypeScript package owns signature normalization, transaction interpretation, exact amount comparisons, and diagnosis. The web UI and MCP server are adapters over that same result model.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5174](http://127.0.0.1:5174).

The public Solana endpoints work for light use. For a more reliable deployment, copy `apps/web/.env.example` to `apps/web/.env.local` and provide a dedicated RPC URL.

## MCP server

Build and run the stdio server:

```bash
npm run build --workspace @did-it-land/mcp
node apps/mcp/dist/index.js
```

It exposes one read-only tool, `verify_solana_transaction`, with the same optional recipient, amount, asset, network, and RPC inputs as the web app.

## Deploy to Vercel

Import the repository into Vercel and select `apps/web` as the project root. Add `SOLANA_RPC_URL` as an environment variable when using a dedicated provider. Vercel will deploy the Next.js interface and `/api/verify` function together.

## Commands

```bash
npm run typecheck
npm test
npm run build
npm run dev:mcp
```

## Limitations

- Transfer detection focuses on native SOL and parsed SPL token instructions.
- Complex program interactions may produce balance changes without a simple transfer row.
- Results depend on the selected RPC provider retaining the transaction.
- Token names, prices, and risk judgments are deliberately out of scope.

## License

[MIT](LICENSE)

"use client";

import { useState, type FormEvent } from "react";
import type { AnalyzeTransactionInput, SolanaCluster } from "@did-it-land/analysis";

const EXAMPLES = {
  succeeded: "3xGsqr2mbExy1kFhXox5kEKVadT3j8eHWPn5ySdsqvkTP63G9Azk6CJiWovZfit9iPQxc9bUHAhcruuQfKuEo4Gy",
  failed: "pzE4qzDj6m4UoqWXinxHwtqBv2gQsCkhsX6jXvyQMLbYtWQyu8MKBBvLjsYVSQU6xcG85WXAgq6EVVskXP9ARqY",
} as const;

interface VerificationFormProps {
  initialSignature: string;
  initialCluster: SolanaCluster;
  loading: boolean;
  onSubmit(input: AnalyzeTransactionInput): Promise<void>;
}

export function VerificationForm({ initialSignature, initialCluster, loading, onSubmit }: VerificationFormProps) {
  const [signature, setSignature] = useState(initialSignature);
  const [cluster, setCluster] = useState(initialCluster);
  const [advanced, setAdvanced] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [mint, setMint] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({
      signature,
      cluster,
      expectation: advanced
        ? { recipient: recipient || undefined, amount: amount || undefined, mint: mint || undefined }
        : undefined,
    });
  };

  const paste = async () => {
    try {
      setSignature(await navigator.clipboard.readText());
    } catch {
      // Clipboard permission varies by browser; the field remains directly editable.
    }
  };

  return (
    <form className="verify-form" onSubmit={submit}>
      <div className="signature-row" aria-busy={loading}>
        <div className="signature-control">
          <input
            aria-label="Transaction signature or explorer URL"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            placeholder="Transaction signature or explorer URL"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="paste-button" type="button" onClick={paste}>Paste</button>
        </div>
        <select
          aria-label="Solana network"
          value={cluster}
          onChange={(event) => setCluster(event.target.value as SolanaCluster)}
        >
          <option value="mainnet-beta">Mainnet</option>
          <option value="devnet">Devnet</option>
          <option value="testnet">Testnet</option>
        </select>
        <button className="submit-button" type="submit" disabled={loading || !signature.trim()}>
          {loading ? "Checking…" : "Verify"}
        </button>
      </div>

      <div className="form-extras">
        <button className="advanced-toggle" type="button" aria-expanded={advanced} onClick={() => setAdvanced((open) => !open)}>
          {advanced ? "− Hide expected outcome" : "+ Check an expected outcome"}
        </button>
        <span className="examples">Examples: <button type="button" onClick={() => setSignature(EXAMPLES.succeeded)}>success</button> <button type="button" onClick={() => setSignature(EXAMPLES.failed)}>failure</button></span>
      </div>

      {advanced && (
        <div className="advanced-fields">
          <input aria-label="Expected recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Expected recipient" spellCheck={false} />
          <input aria-label="Expected amount" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount" inputMode="decimal" />
          <input aria-label="Expected asset" value={mint} onChange={(event) => setMint(event.target.value)} placeholder="SOL or token mint" spellCheck={false} />
        </div>
      )}
    </form>
  );
}

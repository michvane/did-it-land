"use client";

import { useState, type FormEvent } from "react";
import type { AnalyzeTransactionInput, SolanaCluster } from "@did-it-land/analysis";

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

  return (
    <form className="verify-form" onSubmit={submit}>
      <div className="signature-row">
        <input
          aria-label="Transaction signature or explorer URL"
          value={signature}
          onChange={(event) => setSignature(event.target.value)}
          placeholder="Transaction signature or explorer URL"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <select
          aria-label="Solana network"
          value={cluster}
          onChange={(event) => setCluster(event.target.value as SolanaCluster)}
        >
          <option value="mainnet-beta">Mainnet</option>
          <option value="devnet">Devnet</option>
          <option value="testnet">Testnet</option>
        </select>
        <button type="submit" disabled={loading || !signature.trim()}>
          {loading ? "Checking…" : "Verify"}
        </button>
      </div>

      <button className="advanced-toggle" type="button" onClick={() => setAdvanced((open) => !open)}>
        {advanced ? "− Hide expected outcome" : "+ Check an expected outcome"}
      </button>

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

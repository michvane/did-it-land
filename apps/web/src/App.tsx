"use client";

import { useState } from "react";
import type { AnalyzeTransactionInput, SolanaCluster, TransactionAnalysis } from "@did-it-land/analysis";
import { verifyTransaction } from "./api";
import { ResultView } from "./ResultView";
import { VerificationForm } from "./VerificationForm";

interface AppProps {
  initialSignature: string;
  initialCluster: SolanaCluster;
}

export default function App({ initialSignature, initialCluster }: AppProps) {
  const [analysis, setAnalysis] = useState<TransactionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async (input: AnalyzeTransactionInput) => {
    setLoading(true);
    setError(null);
    try {
      const result = await verifyTransaction(input);
      setAnalysis(result);
      const params = new URLSearchParams({ signature: result.signature });
      if (result.cluster !== "mainnet-beta") params.set("cluster", result.cluster);
      window.history.replaceState(null, "", `/?${params.toString()}`);
      window.setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (caught) {
      setAnalysis(null);
      setError(caught instanceof Error ? caught.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="header">
        <a className="brand" href="/">Did it land?</a>
        <span>Solana transaction verifier</span>
      </header>

      <main className="home">
        <section className="intro">
          <p className="label">Transaction receipt</p>
          <h1>Know what happened.</h1>
          <p>Paste a Solana signature. Get a plain answer backed by on-chain data.</p>
        </section>

        <VerificationForm
          initialSignature={initialSignature}
          initialCluster={initialCluster}
          loading={loading}
          onSubmit={verify}
        />

        {error && <p className="error" role="alert">{error}</p>}
        {analysis && <div id="result"><ResultView analysis={analysis} /></div>}
      </main>

      <footer className="footer">
        <span>Read-only</span>
        <span>No wallet connection</span>
        <span>Open source</span>
      </footer>
    </div>
  );
}

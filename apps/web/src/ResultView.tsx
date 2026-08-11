"use client";

import { useState } from "react";
import { createSupportSummary, type TransactionAnalysis } from "@did-it-land/analysis";
import { formatDate, formatFee, shortAddress, titleCase } from "./format";

export function ResultView({ analysis }: { analysis: TransactionAnalysis }) {
  const [copied, setCopied] = useState(false);
  const transferCount = analysis.nativeTransfers.length + analysis.tokenTransfers.length;
  const tone = analysis.state === "failed" || analysis.expectation.overall === "mismatched"
    ? "bad"
    : analysis.state === "not_found" ? "neutral" : "good";
  const query = analysis.cluster === "mainnet-beta" ? "" : `?cluster=${analysis.cluster}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(createSupportSummary(analysis));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={`receipt receipt--${tone}`} aria-live="polite">
      <div className="receipt-head">
        <div className="status-mark" aria-hidden="true">{tone === "good" ? "✓" : tone === "bad" ? "×" : "?"}</div>
        <div>
          <p className="label">{titleCase(analysis.confirmation)} · {analysis.cluster}</p>
          <h2>{analysis.diagnosis.headline}</h2>
          <p>{analysis.diagnosis.summary}</p>
        </div>
      </div>

      <dl className="facts">
        <div><dt>Status</dt><dd>{titleCase(analysis.state)}</dd></div>
        <div><dt>Fee</dt><dd>{formatFee(analysis.feeLamports)}</dd></div>
        <div><dt>Time</dt><dd>{formatDate(analysis.blockTime)}</dd></div>
      </dl>

      {analysis.expectation.overall !== "not_checked" && (
        <div className="intent">
          <div className="section-title"><h3>Expected outcome</h3><span>{titleCase(analysis.expectation.overall)}</span></div>
          {[analysis.expectation.recipient, analysis.expectation.amount, analysis.expectation.asset].map((check, index) => (
            check.state !== "not_checked" && (
              <div className="intent-row" key={index}>
                <span>{check.state === "matched" ? "✓" : check.state === "mismatched" ? "×" : "–"}</span>
                <p>{check.detail}</p>
              </div>
            )
          ))}
        </div>
      )}

      <div className="movements">
        <div className="section-title"><h3>Movements</h3><span>{transferCount}</span></div>
        {analysis.nativeTransfers.map((transfer, index) => (
          <div className="movement" key={`${transfer.source}-${index}`}>
            <span>SOL</span>
            <code>{shortAddress(transfer.source)} → {shortAddress(transfer.destination)}</code>
            <strong>{transfer.amount}</strong>
          </div>
        ))}
        {analysis.tokenTransfers.map((transfer, index) => (
          <div className="movement" key={`${transfer.sourceTokenAccount}-${index}`}>
            <span>Token</span>
            <code>{shortAddress(transfer.sourceOwner ?? transfer.sourceTokenAccount)} → {shortAddress(transfer.destinationOwner ?? transfer.destinationTokenAccount)}</code>
            <strong>{transfer.amount ?? transfer.rawAmount}</strong>
          </div>
        ))}
        {transferCount === 0 && <p className="empty">No standard transfers decoded.</p>}
      </div>

      <p className="next-step"><strong>Next:</strong> {analysis.diagnosis.nextStep}</p>

      <div className="receipt-actions">
        <button type="button" onClick={copy}>{copied ? "Copied" : "Copy report"}</button>
        <a href={`/tx/${analysis.signature}${query}`}>Share</a>
        <a href={analysis.explorerUrl} target="_blank" rel="noreferrer">Explorer ↗</a>
      </div>

      <details>
        <summary>Technical details</summary>
        <dl className="technical-list">
          <div><dt>Signature</dt><dd><code>{analysis.signature}</code></dd></div>
          <div><dt>Fee payer</dt><dd><code>{analysis.feePayer ?? "Unavailable"}</code></dd></div>
          <div><dt>Diagnosis</dt><dd><code>{analysis.diagnosis.code}</code></dd></div>
          {analysis.rawError !== undefined && <div><dt>Raw error</dt><dd><code>{JSON.stringify(analysis.rawError)}</code></dd></div>}
        </dl>
      </details>
    </section>
  );
}

"use client";

import { useState } from "react";
import { createSupportSummary, type TransactionAnalysis } from "@did-it-land/analysis";
import { formatDate, formatFee, shortAddress, titleCase } from "./format";

const INITIAL_MOVEMENT_COUNT = 5;

function MovementList({ analysis }: { analysis: TransactionAnalysis }) {
  const [showAll, setShowAll] = useState(false);
  const rows = [
    ...analysis.nativeTransfers.map((transfer) => ({
      key: `sol-${transfer.source}-${transfer.destination}-${transfer.lamports}`,
      asset: "SOL",
      title: "SOL",
      route: `${shortAddress(transfer.source)} → ${shortAddress(transfer.destination)}`,
      amount: transfer.amount,
    })),
    ...analysis.tokenTransfers.map((transfer) => ({
      key: `token-${transfer.sourceTokenAccount}-${transfer.destinationTokenAccount}-${transfer.rawAmount}`,
      asset: transfer.identity?.symbol ?? "Token",
      title: transfer.identity
        ? `${transfer.identity.name} · ${transfer.mint}`
        : transfer.mint ?? "Unknown token mint",
      route: `${shortAddress(transfer.sourceOwner ?? transfer.sourceTokenAccount)} → ${shortAddress(transfer.destinationOwner ?? transfer.destinationTokenAccount)}`,
      amount: transfer.amount ?? transfer.rawAmount,
    })),
  ];
  const visibleRows = showAll ? rows : rows.slice(0, INITIAL_MOVEMENT_COUNT);
  const remaining = rows.length - INITIAL_MOVEMENT_COUNT;
  const failed = analysis.state === "failed";

  return (
    <div className="movements">
      <div className="section-title">
        <h3>{failed ? "Attempted movements" : "Movements"}</h3>
        <span>{failed ? `${rows.length} · rolled back` : rows.length}</span>
      </div>
      {visibleRows.map((row) => (
        <div className="movement" key={row.key}>
          <span title={row.title}>{row.asset}</span>
          <code>{row.route}</code>
          <strong>{row.amount}</strong>
        </div>
      ))}
      {rows.length === 0 && <p className="empty">No standard transfers decoded.</p>}
      {remaining > 0 && (
        <button className="show-more" type="button" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Show less" : `Show ${remaining} more`}
        </button>
      )}
    </div>
  );
}

export function ResultView({ analysis }: { analysis: TransactionAnalysis }) {
  const [copied, setCopied] = useState(false);
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
        <div><dt>{analysis.state === "failed" ? "Fee charged" : "Network fee"}</dt><dd>{formatFee(analysis.feeLamports)}</dd></div>
        <div><dt>Time</dt><dd>{formatDate(analysis.blockTime)}</dd></div>
      </dl>

      {analysis.failure && (
        <div className="failure-panel">
          <div className="section-title">
            <h3>Why it failed</h3>
            {analysis.failure.resolution.referenceUrl ? (
              <a className="source-link" href={analysis.failure.resolution.referenceUrl} target="_blank" rel="noreferrer">
                {analysis.failure.resolution.sourceLabel} ↗
              </a>
            ) : <span>{analysis.failure.resolution.sourceLabel}</span>}
          </div>
          <dl className="failure-facts">
            <div><dt>Reason</dt><dd>{analysis.failure.resolution.title}</dd></div>
            {analysis.failure.instructionIndex !== undefined && (
              <div><dt>Instruction</dt><dd>{analysis.failure.instructionIndex + 1}</dd></div>
            )}
            {analysis.failure.programId && (
              <div>
                <dt>Program</dt>
                <dd><a href={`https://explorer.solana.com/address/${analysis.failure.programId}${query}`} target="_blank" rel="noreferrer"><code>{shortAddress(analysis.failure.programId, 8, 8)}</code> ↗</a></dd>
              </div>
            )}
          </dl>
          <p>No funds or program state changes from the attempted instructions were committed.</p>
        </div>
      )}

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

      <MovementList key={analysis.signature} analysis={analysis} />

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

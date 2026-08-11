"use client";

import Link from "next/link";

export default function ReportError({ reset }: { reset: () => void }) {
  return (
    <div className="page-shell">
      <header className="header">
        <Link className="brand" href="/">Did it land?</Link>
        <span>Solana transaction receipt</span>
      </header>
      <main className="report-page">
        <p className="label">Report unavailable</p>
        <h1 className="error-title">We couldn’t load this transaction.</h1>
        <p className="error-copy">The signature may be invalid, on another network, or temporarily unavailable from the RPC provider.</p>
        <div className="error-actions">
          <button type="button" onClick={reset}>Try again</button>
          <Link href="/">Check another transaction</Link>
        </div>
      </main>
    </div>
  );
}

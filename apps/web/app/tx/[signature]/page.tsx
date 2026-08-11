import type { Metadata } from "next";
import Link from "next/link";
import { analyzeTransaction, type SolanaCluster } from "@did-it-land/analysis";
import { ResultView } from "../../../src/ResultView";

export const dynamic = "force-dynamic";

interface ReportPageProps {
  params: Promise<{ signature: string }>;
  searchParams: Promise<{ cluster?: string }>;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { signature } = await params;
  return { title: `${signature.slice(0, 8)}… · Did It Land?` };
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const { signature } = await params;
  const query = await searchParams;
  const cluster: SolanaCluster = query.cluster === "devnet" || query.cluster === "testnet"
    ? query.cluster
    : "mainnet-beta";
  const analysis = await analyzeTransaction({
    signature,
    cluster,
    rpcUrl: process.env.SOLANA_RPC_URL,
  });

  return (
    <div className="page-shell">
      <header className="header">
        <Link className="brand" href="/">Did it land?</Link>
      </header>
      <main className="report-page">
        <Link className="back-link" href="/">← Check another transaction</Link>
        <ResultView analysis={analysis} />
      </main>
    </div>
  );
}

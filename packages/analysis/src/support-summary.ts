import type { TransactionAnalysis } from "./types";

function shortAddress(address: string): string {
  return `${address.slice(0, 5)}…${address.slice(-5)}`;
}

export function createSupportSummary(analysis: TransactionAnalysis): string {
  const lines = [
    "Solana transaction verification",
    `Result: ${analysis.diagnosis.headline}`,
    `Signature: ${analysis.signature}`,
    `Network: ${analysis.cluster}`,
    `Confirmation: ${analysis.confirmation}`,
  ];

  if (analysis.slot !== undefined) lines.push(`Slot: ${analysis.slot}`);
  if (analysis.blockTime !== undefined) {
    lines.push(`Time: ${new Date(analysis.blockTime * 1000).toISOString()}`);
  }
  if (analysis.feeLamports) lines.push(`Network fee: ${analysis.feeLamports} lamports`);

  for (const transfer of analysis.nativeTransfers) {
    lines.push(
      `SOL transfer: ${transfer.amount} SOL from ${shortAddress(transfer.source)} to ${shortAddress(transfer.destination)}`,
    );
  }

  for (const transfer of analysis.tokenTransfers) {
    lines.push(
      `Token transfer: ${transfer.amount ?? transfer.rawAmount} of ${transfer.mint ?? "unknown mint"} to ${shortAddress(transfer.destinationOwner ?? transfer.destinationTokenAccount)}`,
    );
  }

  lines.push(`Diagnosis: ${analysis.diagnosis.summary}`);
  lines.push(`Explorer: ${analysis.explorerUrl}`);
  return lines.join("\n");
}

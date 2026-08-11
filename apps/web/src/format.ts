export function shortAddress(value: string, start = 5, end = 5): string {
  if (value.length <= start + end + 1) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

export function formatDate(blockTime?: number): string {
  if (!blockTime) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(blockTime * 1000));
}

export function formatFee(lamports?: string): string {
  if (!lamports) return "Unavailable";
  const sol = Number(lamports) / 1_000_000_000;
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 9 })} SOL`;
}

export function titleCase(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

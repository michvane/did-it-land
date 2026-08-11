const LAMPORTS_PER_SOL = 1_000_000_000n;

export function formatUnits(rawValue: bigint, decimals: number): string {
  const negative = rawValue < 0n;
  const absolute = negative ? -rawValue : rawValue;

  if (decimals === 0) {
    return `${negative ? "-" : ""}${absolute.toString()}`;
  }

  const base = 10n ** BigInt(decimals);
  const whole = absolute / base;
  const fraction = (absolute % base)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return `${negative ? "-" : ""}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

export function formatSol(lamports: bigint): string {
  return formatUnits(lamports, 9);
}

export function parseUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Amount must be a positive decimal number.");
  }

  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimal places.`);
  }

  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

export function solToLamports(value: string): bigint {
  return parseUnits(value, 9);
}

export { LAMPORTS_PER_SOL };

import bs58 from "bs58";

const SIGNATURE_PATH_MARKERS = new Set(["tx", "transaction"]);

export function normalizeSignature(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a transaction signature or explorer URL.");
  }

  let candidate = trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      throw new Error("The explorer URL is not valid.");
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const markerIndex = segments.findIndex((segment) => SIGNATURE_PATH_MARKERS.has(segment));
    candidate = markerIndex >= 0 ? (segments[markerIndex + 1] ?? "") : (segments.at(-1) ?? "");
  }

  try {
    if (bs58.decode(candidate).length !== 64) {
      throw new Error();
    }
  } catch {
    throw new Error("That does not look like a valid Solana transaction signature.");
  }

  return candidate;
}

import type { FailureResolution } from "./types";

const TOKEN_PROGRAMS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
]);

const TOKEN_ERRORS: Record<string, { title: string; message: string }> = {
  "0": { title: "Account is not rent exempt", message: "The token account does not hold the minimum balance required to remain active." },
  "1": { title: "Insufficient token balance", message: "The source token account does not contain enough tokens for this instruction." },
  "2": { title: "Invalid mint", message: "The instruction used a token mint that the Token Program could not accept." },
  "3": { title: "Token mint mismatch", message: "The token accounts involved do not use the same mint." },
  "4": { title: "Token owner mismatch", message: "The supplied authority does not own the token account." },
  "5": { title: "Token supply is fixed", message: "This mint has no mint authority, so its supply cannot be increased." },
  "6": { title: "Account already initialized", message: "The instruction tried to initialize a token account that is already in use." },
  "9": { title: "Token account is not initialized", message: "The instruction expected an initialized token account or mint." },
  "12": { title: "Invalid token instruction", message: "The Token Program could not decode or accept the supplied instruction." },
  "14": { title: "Token amount overflow", message: "The token calculation exceeded the numeric range supported by the program." },
  "17": { title: "Token account is frozen", message: "A frozen token account cannot perform this operation." },
  "18": { title: "Token decimals mismatch", message: "The instruction supplied a decimal precision that does not match the mint." },
};

const TOKEN_ERROR_REFERENCE = "https://github.com/solana-program/token/blob/main/program/src/error.rs";

function readableName(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function fromAnchorLogs(logs: string[], expectedCode?: string): FailureResolution | undefined {
  for (const log of logs) {
    const match = log.match(
      /AnchorError.*?Error Code:\s*([^.]+)\.\s*Error Number:\s*(\d+)\.\s*Error Message:\s*(.+?)(?:\.$|$)/,
    );
    const errorName = match?.[1];
    const errorNumber = match?.[2];
    const errorMessage = match?.[3];
    if (!errorName || !errorNumber || !errorMessage || (expectedCode && errorNumber !== expectedCode)) continue;

    return {
      title: readableName(errorName.trim()),
      message: errorMessage.trim(),
      source: "program_logs",
      sourceLabel: "Program logs",
    };
  }
  return undefined;
}

export function resolveProgramError(input: {
  programId?: string;
  errorCode?: string;
  fallbackLabel: string;
  logs: string[];
}): FailureResolution {
  const logged = fromAnchorLogs(input.logs, input.errorCode);
  if (logged) return logged;

  const evidence = input.logs.join(" ").toLowerCase();
  if (evidence.includes("insufficient funds")) {
    return {
      title: "Insufficient funds",
      message: "The transaction did not have enough funds for the requested operation.",
      source: "program_logs",
      sourceLabel: "Program logs",
    };
  }
  if (evidence.includes("slippage")) {
    return {
      title: "Slippage limit exceeded",
      message: "The available execution price moved outside the transaction's allowed range.",
      source: "program_logs",
      sourceLabel: "Program logs",
    };
  }
  if (evidence.includes("computational budget exceeded") || /compute(?: unit| budget)[^.;]*exceeded/.test(evidence)) {
    return {
      title: "Compute limit exceeded",
      message: "The program needed more compute units than the transaction allowed.",
      source: "program_logs",
      sourceLabel: "Program logs",
    };
  }

  if (input.programId && TOKEN_PROGRAMS.has(input.programId) && input.errorCode) {
    const known = TOKEN_ERRORS[input.errorCode];
    if (known) {
      return {
        ...known,
        source: "known_program",
        sourceLabel: "SPL Token definition",
        referenceUrl: TOKEN_ERROR_REFERENCE,
      };
    }
  }

  return {
    title: input.errorCode ? `Unknown program error ${input.errorCode}` : input.fallbackLabel,
    message: input.errorCode
      ? "This app does not recognize that program error yet."
      : "The program rejected the instruction without a recognized explanation.",
    source: "unknown",
    sourceLabel: "Unresolved",
  };
}

import { describe, expect, it } from "vitest";
import { resolveProgramError } from "./program-errors";

describe("program error resolution", () => {
  it("uses an Anchor error message embedded in transaction logs", () => {
    const result = resolveProgramError({
      programId: "Example1111111111111111111111111111111111",
      errorCode: "6016",
      fallbackLabel: "Custom program error 6016",
      logs: [
        "Program log: AnchorError occurred. Error Code: InvalidSecpSignature. Error Number: 6016. Error Message: The signature is invalid.",
      ],
    });

    expect(result).toEqual({
      title: "Invalid Secp Signature",
      message: "The signature is invalid",
      source: "program_logs",
      sourceLabel: "Program logs",
    });
  });

  it("uses a published SPL Token definition for a matching program and code", () => {
    const result = resolveProgramError({
      programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      errorCode: "1",
      fallbackLabel: "Custom program error 1",
      logs: [],
    });

    expect(result).toMatchObject({
      title: "Insufficient token balance",
      source: "known_program",
      sourceLabel: "SPL Token definition",
    });
  });

  it("labels unsupported program-specific codes as unresolved", () => {
    const result = resolveProgramError({
      programId: "Unknown111111111111111111111111111111111",
      errorCode: "6016",
      fallbackLabel: "Custom program error 6016",
      logs: [],
    });

    expect(result).toEqual({
      title: "Unknown program error 6016",
      message: "This app does not recognize that program error yet.",
      source: "unknown",
      sourceLabel: "Unresolved",
    });
  });

  it("does not interpret a program-scoped hexadecimal code by itself", () => {
    const result = resolveProgramError({
      programId: "Unknown111111111111111111111111111111111",
      errorCode: "6001",
      fallbackLabel: "Custom program error 6001",
      logs: ["Program Unknown111111111111111111111111111111111 failed: custom program error: 0x1771"],
    });

    expect(result.source).toBe("unknown");
  });
});

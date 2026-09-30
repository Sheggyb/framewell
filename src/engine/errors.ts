/**
 * Errors with a stable `code` (plus values like a file name), so the UI can show them in the
 * user's language. `message` stays English, for logs and as a fallback.
 */
export class CodedError<C extends string = string> extends Error {
  constructor(
    readonly code: C,
    message: string,
    readonly params: Record<string, string | number> = {},
  ) {
    super(message);
  }
}

export const diagnosticCodes = [
  'invalid-input',
  'invalid-state',
  'unsupported-format',
  'over-limit',
  'malformed-metadata',
  'decode-failed',
  'metadata-preservation-unavailable',
  'encode-failed',
  'save-cancelled',
  'save-failed',
  'quota-exceeded',
  'out-of-coverage',
  'unsupported-precision',
  'ambiguous-zone',
  'storage-error',
  'incompatible-version',
] as const;

export type DiagnosticCode = (typeof diagnosticCodes)[number] | (string & {});

export type Diagnostic = Readonly<{
  code: DiagnosticCode;
  message: string;
}>;

const messages: Readonly<Record<(typeof diagnosticCodes)[number], string>> = {
  'invalid-input': 'The provided value is invalid.',
  'invalid-state': 'The requested action is not available in the current state.',
  'unsupported-format': 'This photo format is not supported.',
  'over-limit': 'The photo or batch exceeds a supported limit.',
  'malformed-metadata': 'The photo metadata is malformed.',
  'decode-failed': 'The photo could not be decoded.',
  'metadata-preservation-unavailable': 'Supported metadata could not be preserved safely.',
  'encode-failed': 'The photo could not be exported.',
  'save-cancelled': 'Saving was cancelled.',
  'save-failed': 'The exported photo could not be handed off.',
  'quota-exceeded': 'Local storage is full.',
  'out-of-coverage': 'The coordinate is outside supported coverage.',
  'unsupported-precision': 'The requested precision is not supported.',
  'ambiguous-zone': 'The coordinate zone needs confirmation.',
  'storage-error': 'Local recovery is temporarily unavailable.',
  'incompatible-version': 'This saved draft was created by a newer application version.',
};

/** Create a user-safe diagnostic without retaining input, paths, coordinates, or metadata. */
export function sanitizeDiagnostic(code: string): Diagnostic {
  const knownCode = code as (typeof diagnosticCodes)[number];
  return {
    code,
    message: messages[knownCode] ?? 'The operation could not be completed.',
  };
}

import { describe, expect, it } from 'vitest';

import { sanitizeDiagnostic } from '../../../src/infrastructure/platform/diagnostics';

describe('sanitized diagnostics', () => {
  it('keeps known stable codes and their generic messages', () => {
    expect(sanitizeDiagnostic('malformed-metadata')).toEqual({
      code: 'malformed-metadata',
      message: 'The photo metadata is malformed.',
    });
  });

  it('does not echo unknown local paths, coordinates, or annotation content', () => {
    const sensitive = String.raw`C:\Users\person\private\25.033,121.5654\inspection complete`;
    const diagnostic = sanitizeDiagnostic(sensitive);
    expect(diagnostic).toEqual({
      code: 'unknown-error',
      message: 'The operation could not be completed.',
    });
    expect(JSON.stringify(diagnostic)).not.toContain('person');
    expect(JSON.stringify(diagnostic)).not.toContain('25.033');
    expect(JSON.stringify(diagnostic)).not.toContain('inspection complete');
  });
});

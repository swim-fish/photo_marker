import { describe, expect, it } from 'vitest';

import { failure, isFailure, isSuccess, success } from '../../../src/domain/result';
import { sanitizeDiagnostic } from '../../../src/infrastructure/platform/diagnostics';

describe('typed results and diagnostics', () => {
  it('represents a typed success without diagnostic fields', () => {
    const result = success({ accepted: true });

    expect(result).toEqual({ ok: true, value: { accepted: true } });
    expect(isSuccess(result)).toBe(true);
    expect(isFailure(result)).toBe(false);
  });

  it('sanitizes a failure to a stable non-sensitive diagnostic', () => {
    const result = failure('decode-failed', {
      message: 'decode failed for C:\\Users\\someone\\private-photo.jpg',
      details: { bytes: [1, 2, 3], coordinate: { latitude: 25.04, longitude: 121.56 } },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('decode-failed');
    expect(result.error.message).toBe('The photo could not be decoded.');
    expect(JSON.stringify(result)).not.toContain('private-photo');
    expect(JSON.stringify(result)).not.toContain('121.56');
  });

  it('uses a safe fallback for unknown diagnostic codes', () => {
    expect(sanitizeDiagnostic('unknown-code')).toEqual({
      code: 'unknown-code',
      message: 'The operation could not be completed.',
    });
  });
});

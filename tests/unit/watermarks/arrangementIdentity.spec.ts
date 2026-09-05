import { it, expect } from 'vitest';
import {
  arrangeWatermark,
  resolveWatermarkArrangement,
} from '../../../src/domain/watermarks/layout';
import { defaultWatermark } from '../../../src/domain/watermarks/types';
it('does not reuse another photo or algorithm arrangement with the same fingerprint', () => {
  const config = { ...defaultWatermark, enabled: true, text: 'MARK', mode: 'repeat' as const };
  const previous = arrangeWatermark('old', 4 / 3, config)!,
    current = arrangeWatermark('new', 4 / 3, config)!;
  expect(previous.configFingerprint).toBe(current.configFingerprint);
  expect(resolveWatermarkArrangement(current, previous)).toEqual(current);
  expect(
    resolveWatermarkArrangement(current, {
      ...current,
      algorithmVersion: 2,
    } as unknown as typeof current),
  ).toEqual(current);
  expect(resolveWatermarkArrangement(current, current)).toBe(current);
});

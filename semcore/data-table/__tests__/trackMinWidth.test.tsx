import { expect, describe, test } from '@semcore/testing-utils/vitest';

import { withTrackMinWidth } from '../src/components/DataTable/trackMinWidth';

describe('withTrackMinWidth', () => {
  test('floors a single track, which becomes the maximum', () => {
    expect(withTrackMinWidth('max-content', 74)).toBe('minmax(74px, max-content)');
    expect(withTrackMinWidth('68px', 74)).toBe('minmax(74px, 68px)');
    expect(withTrackMinWidth('1fr', 74)).toBe('minmax(74px, 1fr)');
    expect(withTrackMinWidth('auto', 74)).toBe('minmax(74px, auto)');
  });

  test('raises the minimum of a minmax track, keeping its maximum', () => {
    expect(withTrackMinWidth('minmax(260px, 1fr)', 74)).toBe('minmax(max(260px, 74px), 1fr)');
    expect(withTrackMinWidth('minmax(60px, 66px)', 74)).toBe('minmax(max(60px, 74px), 66px)');
    expect(withTrackMinWidth('minmax(calc(10% + 4px), max-content)', 74)).toBe(
      'minmax(max(calc(10% + 4px), 74px), max-content)',
    );
  });

  test('replaces the minimums that cannot take part in max()', () => {
    // a unitless 0 is a number in max(), not a length
    expect(withTrackMinWidth('minmax(0, 68px)', 74)).toBe('minmax(74px, 68px)');
    expect(withTrackMinWidth('minmax(auto, 1fr)', 74)).toBe('minmax(74px, 1fr)');
  });

  test('keeps the content-based tracks, their content already includes the sort icon', () => {
    expect(withTrackMinWidth('minmax(max-content, 1fr)', 74)).toBe('minmax(max-content, 1fr)');
    expect(withTrackMinWidth('minmax(min-content, 200px)', 74)).toBe('minmax(min-content, 200px)');
    expect(withTrackMinWidth('fit-content(120px)', 74)).toBe('fit-content(120px)');
  });
});

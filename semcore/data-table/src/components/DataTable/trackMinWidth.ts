// minimums based on the content: they already include the sort icon (see Head/style.shadow.css), and can't be
// compared with a length inside max()
const CONTENT_BASED_MIN = /^(min-content|max-content|fit-content)/;

/** Top-level arguments of a `minmax(a, b)` track, `null` for other tracks. */
const parseMinmax = (track: string): [string, string] | null => {
  const value = track.trim();

  if (!value.startsWith('minmax(') || !value.endsWith(')')) {
    return null;
  }

  const inner = value.slice('minmax('.length, -1);
  let depth = 0;

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];

    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      return [inner.slice(0, i).trim(), inner.slice(i + 1).trim()];
    }
  }

  return null;
};

/**
 * Track of a sorted `changeSortSize` column: its own track with the `minWidth` floor, so the column grows
 * only when it is narrower than the caption with the sort icon, and keeps its own sizing otherwise.
 */
export const withTrackMinWidth = (track: string, minWidth: number): string => {
  const min = `${minWidth}px`;
  const value = track.trim();
  const minmax = parseMinmax(value);

  if (minmax === null) {
    // fit-content() is not allowed inside minmax(), its content-based size already includes the icon
    return value.startsWith('fit-content(') ? value : `minmax(${min}, ${value})`;
  }

  const [trackMin, trackMax] = minmax;

  if (CONTENT_BASED_MIN.test(trackMin)) {
    return value;
  }

  // `auto` as a minimum is the content-based minimum, the caption with the icon is the floor instead
  if (trackMin === 'auto' || trackMin === '0') {
    return `minmax(${min}, ${trackMax})`;
  }

  return `minmax(max(${trackMin}, ${min}), ${trackMax})`;
};

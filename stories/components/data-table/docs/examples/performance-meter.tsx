import React from 'react';

/**
 * Self-contained performance meter for the DataTable stress story.
 *
 * Built only from plain DOM elements (no semcore components), so the meter itself renders
 * the same on the baseline branch and on the branch with fixes. Runs are kept in localStorage:
 * the storybook origin stays the same across `git switch`, so runs from both branches can be
 * compared side by side.
 *
 * Numbers in `pnpm storybook` come from the React development build: compare runs with each other,
 * not with production timings.
 */

export type MeterHandles = {
  /** Remounts the table (fresh mount cost). */
  remount: () => void;
  /** Switches the metric mode select to the next value. */
  cycleMetricMode: () => void;
};

type Metrics = Record<string, number>;
type ScenarioResults = Record<string, Metrics>;

type Run = {
  id: string;
  label: string;
  date: string;
  args: string;
  results: ScenarioResults;
};

const STORAGE_KEY = 'intergalactic:data-table-perf-runs';
const MAX_RUNS = 8;
const SLOW_FRAME_MS = 20;
const SCROLL_STEP_PX = 60;
const MAX_SCROLL_FRAMES = 400;
const SCENARIO_TIMEOUT_MS = 60_000;

/* ---------- profiler / long tasks ---------- */

export const profilerStats = { commits: 0, renderMs: 0 };

export const onProfilerRender: React.ProfilerOnRenderCallback = (_id, _phase, actualDuration) => {
  profilerStats.commits += 1;
  profilerStats.renderMs += actualDuration;
};

const longTasks = { count: 0, ms: 0 };
let longTaskObserver: PerformanceObserver | null = null;

const startLongTasks = () => {
  longTasks.count = 0;
  longTasks.ms = 0;
  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.count += 1;
        longTasks.ms += entry.duration;
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: false });
  } catch {
    longTaskObserver = null; // Not supported outside Chromium.
  }
};

const stopLongTasks = () => {
  longTaskObserver?.takeRecords().forEach((entry) => {
    longTasks.count += 1;
    longTasks.ms += entry.duration;
  });
  longTaskObserver?.disconnect();
  longTaskObserver = null;
};

/* ---------- helpers ---------- */

const raf = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
// rAF fires before paint; a macrotask queued from it runs after the frame is painted.
const nextPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
};

const round = (value: number) => Math.round(value * 10) / 10;

const isScrollable = (node: HTMLElement, axis: 'x' | 'y') => {
  const style = getComputedStyle(node);
  const overflow = axis === 'x' ? style.overflowX : style.overflowY;
  if (overflow !== 'auto' && overflow !== 'scroll') return 0;
  return axis === 'x' ? node.scrollWidth - node.clientWidth : node.scrollHeight - node.clientHeight;
};

type Scroller = { get: () => number; set: (value: number) => void; max: () => number };

const findScroller = (root: HTMLElement, axis: 'x' | 'y'): Scroller | null => {
  let best: HTMLElement | null = null;
  let bestRange = 0;
  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    const range = isScrollable(node, axis);
    if (range > bestRange) {
      best = node;
      bestRange = range;
    }
  });

  const node = best as HTMLElement | null;
  if (node) {
    return axis === 'x'
      ? {
          get: () => node.scrollLeft,
          set: (value) => (node.scrollLeft = value),
          max: () => node.scrollWidth - node.clientWidth,
        }
      : {
          get: () => node.scrollTop,
          set: (value) => (node.scrollTop = value),
          max: () => node.scrollHeight - node.clientHeight,
        };
  }

  if (axis === 'y') {
    const doc = document.scrollingElement ?? document.documentElement;
    if (doc.scrollHeight > doc.clientHeight) {
      return {
        get: () => doc.scrollTop,
        set: (value) => (doc.scrollTop = value),
        max: () => doc.scrollHeight - doc.clientHeight,
      };
    }
  }

  return null;
};

const withCounters = async (fn: () => Promise<Metrics>): Promise<Metrics> => {
  await nextPaint();
  await wait(50);
  profilerStats.commits = 0;
  profilerStats.renderMs = 0;
  startLongTasks();
  const metrics = await fn();
  await wait(50);
  stopLongTasks();

  return {
    ...metrics,
    'commits': profilerStats.commits,
    'react render, ms': round(profilerStats.renderMs),
    'long tasks': longTasks.count,
    'long tasks, ms': round(longTasks.ms),
  };
};

/** Time from action to the next painted frame, repeated `times`. */
const measureInteraction = (times: number, action: (i: number) => void | false) =>
  withCounters(async () => {
    const samples: number[] = [];
    for (let i = 0; i < times; i += 1) {
      const start = performance.now();
      if (action(i) === false) break;
      await nextPaint();
      samples.push(performance.now() - start);
      await wait(30);
    }

    return {
      'samples': samples.length,
      'median, ms': round(percentile(samples, 0.5)),
      'p95, ms': round(percentile(samples, 0.95)),
      'max, ms': round(Math.max(0, ...samples)),
    };
  });

/** Scrolls by a fixed step every frame (there and back) and records frame durations. */
const measureScroll = (scroller: Scroller | null) =>
  withCounters(async () => {
    if (!scroller) return { 'no scroll container': 1 };

    scroller.set(0);
    await nextPaint();

    const deltas: number[] = [];
    let last = await raf();
    let direction = 1;

    for (let frame = 0; frame < MAX_SCROLL_FRAMES; frame += 1) {
      const next = scroller.get() + SCROLL_STEP_PX * direction;
      if (direction > 0 && next >= scroller.max()) direction = -1;
      if (direction < 0 && next <= 0) break;
      scroller.set(Math.max(0, Math.min(scroller.max(), next)));
      const now = await raf();
      deltas.push(now - last);
      last = now;
    }
    scroller.set(0);

    const slow = deltas.filter((delta) => delta > SLOW_FRAME_MS).length;
    return {
      'frames': deltas.length,
      'avg frame, ms': round(deltas.reduce((sum, delta) => sum + delta, 0) / (deltas.length || 1)),
      'p95 frame, ms': round(percentile(deltas, 0.95)),
      'max frame, ms': round(Math.max(0, ...deltas)),
      [`frames > ${SLOW_FRAME_MS}ms`]: slow,
    };
  });

const scrollPageToTop = () => {
  (document.scrollingElement ?? document.documentElement).scrollTop = 0;
};

/* ---------- scenarios ---------- */

type Scenario = {
  name: string;
  run: (root: HTMLElement, handles: MeterHandles) => Promise<Metrics>;
};

const SCENARIOS: Scenario[] = [
  {
    name: 'mount',
    run: (_root, handles) => measureInteraction(3, () => handles.remount()),
  },
  {
    name: 'sort (keyword)',
    run: (root) =>
      measureInteraction(6, () => {
        const header = Array.from(root.querySelectorAll<HTMLElement>('[role="columnheader"]')).find(
          (node) => node.textContent?.includes('Keyword'),
        );
        const button = header?.querySelector<HTMLElement>('button');
        if (!button) return false;
        button.click();
      }),
  },
  {
    name: 'metric mode switch',
    run: (_root, handles) => measureInteraction(6, () => handles.cycleMetricMode()),
  },
  {
    name: 'select all',
    run: (root) =>
      measureInteraction(4, () => {
        const input = root.querySelector<HTMLInputElement>(
          '[role="columnheader"] input[type="checkbox"]',
        );
        if (!input) return false;
        input.click();
      }),
  },
  {
    name: 'select one row',
    run: (root) =>
      measureInteraction(6, (i) => {
        const inputs = root.querySelectorAll<HTMLInputElement>(
          '[role="gridcell"] input[type="checkbox"]',
        );
        const input = inputs[Math.floor(i / 2)];
        if (!input) return false;
        input.click();
      }),
  },
  {
    name: 'accordion expand + collapse',
    run: async (root) => {
      scrollPageToTop();
      const count = 5;
      return measureInteraction(count * 2, (i) => {
        const toggles = root.querySelectorAll<HTMLElement>('button[aria-expanded]');
        const toggle = toggles[i % count];
        if (!toggle) return false;
        toggle.click();
      });
    },
  },
  {
    name: 'vertical scroll',
    run: async (root) => measureScroll(findScroller(root, 'y')),
  },
  {
    name: 'horizontal scroll',
    run: async (root) => {
      scrollPageToTop();
      return measureScroll(findScroller(root, 'x'));
    },
  },
];

/* ---------- storage ---------- */

const loadRuns = (): Run[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const saveRuns = (runs: Run[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(-MAX_RUNS)));
};

/* ---------- UI ---------- */

const cellStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderBottom: '1px solid #e0e1e9',
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

const deltaColor = (base: number | undefined, value: number | undefined, metric: string) => {
  if (base === undefined || value === undefined || base === 0) return undefined;
  if (metric === 'samples' || metric === 'frames') return undefined;
  const ratio = (value - base) / base;
  if (Math.abs(ratio) < 0.1) return undefined;
  return ratio < 0 ? '#007c65' : '#d1002f';
};

type PerformanceMeterProps = {
  rootRef: React.RefObject<HTMLElement>;
  handles: MeterHandles;
  args: object;
};

export const PerformanceMeter = ({ rootRef, handles, args }: PerformanceMeterProps) => {
  const [runs, setRuns] = React.useState<Run[]>(loadRuns);
  const [label, setLabel] = React.useState('before');
  const [status, setStatus] = React.useState('');
  const [running, setRunning] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(() => SCENARIOS.map((s) => s.name));

  const handlesRef = React.useRef(handles);
  handlesRef.current = handles;

  const argsString = JSON.stringify(args);

  const run = React.useCallback(async (runLabel = label, only?: string[]) => {
    const root = rootRef.current;
    if (!root) return null;
    setRunning(true);
    const results: ScenarioResults = {};
    const names = only ?? selected;

    for (const scenario of SCENARIOS) {
      if (!names.includes(scenario.name)) continue;
      setStatus(`running: ${scenario.name}`);
      await wait(100);
      // A stuck scenario (e.g. HMR reload mid-run) must not hang the whole run.
      results[scenario.name] = await Promise.race([
        scenario.run(root, handlesRef.current),
        wait(SCENARIO_TIMEOUT_MS).then(() => ({ 'timed out': 1 })),
      ]);
    }

    const entry: Run = {
      id: String(Date.now()),
      label: runLabel,
      date: new Date().toLocaleTimeString(),
      args: argsString,
      results,
    };
    const next = [...loadRuns(), entry].slice(-MAX_RUNS);
    saveRuns(next);
    setRuns(next);
    setRunning(false);
    setStatus('done');

    console.log(`[data-table perf] ${runLabel}`, results);
    return entry;
  }, [label, selected, argsString, rootRef]);

  // Automation hook: `await window.__dataTablePerf.run('after')` (e.g. from Playwright).
  React.useEffect(() => {
    (window as any).__dataTablePerf = { run, scenarios: SCENARIOS.map((s) => s.name) };
  }, [run]);

  const removeRun = (id: string) => {
    const next = runs.filter((item) => item.id !== id);
    saveRuns(next);
    setRuns(next);
  };

  const clear = () => {
    saveRuns([]);
    setRuns([]);
  };

  const copy = () => {
    navigator.clipboard?.writeText(JSON.stringify(runs, null, 2));
    setStatus('copied JSON');
  };

  const rows: Array<{ scenario: string; metric: string }> = [];
  SCENARIOS.forEach(({ name }) => {
    const metrics = new Set<string>();
    runs.forEach((item) => Object.keys(item.results[name] ?? {}).forEach((m) => metrics.add(m)));
    metrics.forEach((metric) => rows.push({ scenario: name, metric }));
  });

  const baseRun = runs[0];
  const argsDiffer = runs.some((item) => item.args !== runs[0]?.args);

  return (
    <div
      style={{
        font: '12px/1.4 system-ui, sans-serif',
        border: '1px solid #c4c7cf',
        borderRadius: 6,
        padding: 12,
        marginBottom: 16,
        background: '#f8f9fb',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <b>Perf meter</b>
        <input
          aria-label='Run label'
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ width: 120 }}
        />
        <button type='button' disabled={running} onClick={() => run()}>
          Run
        </button>
        <button type='button' disabled={running || !runs.length} onClick={copy}>
          Copy JSON
        </button>
        <button type='button' disabled={running || !runs.length} onClick={clear}>
          Clear runs
        </button>
        <span style={{ color: '#6c6e79' }}>{status}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '8px 0' }}>
        {SCENARIOS.map(({ name }) => (
          <label key={name} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={selected.includes(name)}
              onChange={() =>
                setSelected((prev) =>
                  prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name])}
            />
            {name}
          </label>
        ))}
      </div>
      {argsDiffer && (
        <div style={{ color: '#d1002f', marginBottom: 8 }}>
          Runs were made with different story args: hover a run header to see them.
        </div>
      )}
      {runs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...cellStyle, textAlign: 'left' }}>scenario</th>
                <th style={{ ...cellStyle, textAlign: 'left' }}>metric</th>
                {runs.map((item) => (
                  <th key={item.id} style={cellStyle} title={item.args}>
                    {item.label}
                    <div style={{ fontWeight: 'normal', color: '#6c6e79' }}>
                      {item.date}
                      {' '}
                      <button
                        type='button'
                        aria-label={`Remove run ${item.label}`}
                        onClick={() => removeRun(item.id)}
                        style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ scenario, metric }, index) => (
                <tr key={`${scenario}-${metric}`}>
                  <td style={{ ...cellStyle, textAlign: 'left', fontWeight: 600 }}>
                    {rows[index - 1]?.scenario === scenario ? '' : scenario}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'left' }}>{metric}</td>
                  {runs.map((item) => {
                    const value = item.results[scenario]?.[metric];
                    const base = baseRun.results[scenario]?.[metric];
                    return (
                      <td
                        key={item.id}
                        style={{ ...cellStyle, color: item === baseRun ? undefined : deltaColor(base, value, metric) }}
                      >
                        {value ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ color: '#6c6e79', marginTop: 4 }}>
            Colors compare against the first run: green is ≥10% lower, red is ≥10% higher.
          </div>
        </div>
      )}
    </div>
  );
};

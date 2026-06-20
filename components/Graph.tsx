import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, useWindowDimensions, View } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { evaluate, totalDuration } from '@/engine/curveEngine';
import { effectiveElapsed, useStopwatch } from '@/store/StopwatchContext';
import { Colors } from '@/constants/theme';
import type { StopwatchType } from '@/types/models';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface GraphEntry {
  type: StopwatchType;
  startTime: number;
}

/** A vertical start-time marker shown in plan mode instead of full curves */
export interface PlanMarker {
  startTime: number;
  /** e.g. "My Plan · Quick" */
  label: string;
  color: string;
}

/** Imperative handle exposed via forwardRef */
export interface GraphRef {
  resetView: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAD = { top: 20, right: 16, bottom: 44, left: 46 };
const SAMPLES     = 150;               // halved for render performance
const BUFFER_MS   = 20 * 60_000;       // 20-minute padding on each end
const MIN_WINDOW  =  1 * 3_600_000;    // 1 hour minimum zoom
const MAX_WINDOW  = 12 * 3_600_000;    // 12 hour maximum zoom

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPath(
  times: number[],
  values: number[],
  from: number,
  to: number,
  mapT: (t: number) => number,
  mapV: (v: number) => number,
): string {
  if (to <= from) return '';
  const pts: string[] = [];
  for (let i = from; i < to; i++) {
    const x = mapT(times[i]).toFixed(1);
    const y = mapV(values[i]).toFixed(1);
    pts.push(`${i === from ? 'M' : 'L'}${x},${y}`);
  }
  return pts.join(' ');
}

function touchDist(
  t1: { pageX: number; pageY: number },
  t2: { pageX: number; pageY: number },
): number {
  return Math.hypot(t2.pageX - t1.pageX, t2.pageY - t1.pageY);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GraphProps {
  /** Current wall-clock time in ms — updated by parent's interval */
  currentTime: number;
  height?: number;
  colorScheme: 'light' | 'dark';
  /**
   * When provided, renders these entries instead of the context's active
   * stopwatches. Pass [] to suppress all curves (plan marker-only mode).
   */
  overrideEntries?: GraphEntry[];
  /**
   * Plan start-time markers — vertical lines with labels shown in addition
   * to (or instead of) curves.
   */
  planMarkers?: PlanMarker[];
  /**
   * Called whenever the graph is panned/zoomed away from the auto window,
   * or snapped back. Used by the parent to show a "Back to Now" button.
   */
  onIsPanned?: (isPanned: boolean) => void;
}

export const Graph = forwardRef<GraphRef, GraphProps>(function Graph(
  { currentTime, height = 280, colorScheme, overrideEntries, planMarkers, onIsPanned },
  ref,
) {
  const { width } = useWindowDimensions();
  const { state } = useStopwatch();
  const isDark = colorScheme === 'dark';

  const cw = width - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;

  // ── Zoom / pan state ──────────────────────────────────────────────────────
  // panOffsetMs: how far the center of the view is shifted from "now"
  // windowMs: explicit duration in ms (0 = auto-computed from data)
  const [panOffsetMs, setPanOffsetMs] = useState(0);
  const [windowMs, setWindowMs] = useState(0);

  // Refs for live values accessible inside PanResponder (avoids stale closures)
  const cwRef = useRef(cw);
  cwRef.current = cw;
  const wDurRef = useRef(4 * 3_600_000); // updated after each useMemo
  const panOffsetMsRef = useRef(panOffsetMs);
  panOffsetMsRef.current = panOffsetMs;
  const windowMsRef = useRef(windowMs);
  windowMsRef.current = windowMs;

  // ── Imperative handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    resetView: () => {
      setPanOffsetMs(0);
      setWindowMs(0);
    },
  }));

  // ── Notify parent of panned state ─────────────────────────────────────────
  const onIsPannedRef = useRef(onIsPanned);
  onIsPannedRef.current = onIsPanned;
  useEffect(() => {
    onIsPannedRef.current?.(panOffsetMs !== 0 || windowMs !== 0);
  }, [panOffsetMs, windowMs]);

  // RAF handles for batching gesture-driven state updates at ≤60fps
  const panRafRef  = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const zoomRafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  // Accumulator refs so RAF always commits the latest value, not a stale closure
  const pendingPanRef  = useRef(0);
  const pendingZoomRef = useRef(0);

  // ── Gesture tracking ──────────────────────────────────────────────────────
  const gestureRef = useRef({
    isPanning:            false,
    isPinching:           false,
    lastX:                0,
    lastDist:             0,
    windowMsAtPinchStart: 0,
  });

  const panResponder = useRef(
    PanResponder.create({
      // Claim pinch immediately; claim pan only for clear horizontal swipes
      onStartShouldSetPanResponder: e =>
        e.nativeEvent.touches.length >= 2,
      onMoveShouldSetPanResponder: (e, gs) => {
        if (e.nativeEvent.touches.length >= 2) return true;
        return Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && Math.abs(gs.dx) > 6;
      },

      onPanResponderGrant: e => {
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          gestureRef.current.isPinching = true;
          gestureRef.current.isPanning  = false;
          gestureRef.current.lastDist   = touchDist(touches[0], touches[1]);
          // Capture the effective window at pinch start
          gestureRef.current.windowMsAtPinchStart =
            windowMsRef.current > 0 ? windowMsRef.current : wDurRef.current;
          pendingZoomRef.current = gestureRef.current.windowMsAtPinchStart;
        } else {
          gestureRef.current.isPanning  = true;
          gestureRef.current.isPinching = false;
          gestureRef.current.lastX      = touches[0].pageX;
          pendingPanRef.current = panOffsetMsRef.current;
        }
      },

      onPanResponderMove: e => {
        const touches = e.nativeEvent.touches;

        if (touches.length >= 2 && gestureRef.current.isPinching) {
          // ── Pinch to zoom — update accumulator, batch via RAF ──────────────
          const d = touchDist(touches[0], touches[1]);
          if (d < 1) return;
          const scale = gestureRef.current.lastDist / d;
          pendingZoomRef.current = Math.min(
            Math.max(gestureRef.current.windowMsAtPinchStart * scale, MIN_WINDOW),
            MAX_WINDOW,
          );
          if (zoomRafRef.current === null) {
            zoomRafRef.current = requestAnimationFrame(() => {
              setWindowMs(pendingZoomRef.current);
              zoomRafRef.current = null;
            });
          }

        } else if (gestureRef.current.isPanning && touches.length === 1) {
          // ── Swipe to pan — update accumulator, batch via RAF ──────────────
          const dx = touches[0].pageX - gestureRef.current.lastX;
          gestureRef.current.lastX = touches[0].pageX;
          const msPerPx = wDurRef.current / cwRef.current;
          pendingPanRef.current -= dx * msPerPx;
          if (panRafRef.current === null) {
            panRafRef.current = requestAnimationFrame(() => {
              setPanOffsetMs(pendingPanRef.current);
              panRafRef.current = null;
            });
          }
        }
      },

      // Once the Graph has the gesture, refuse to give it up.
      // Without this, the parent ScrollView reclaims mid-drag and isPanning
      // resets to false while the finger is still down — causing the "stops" bug.
      onPanResponderTerminationRequest: () => false,

      onPanResponderRelease: () => {
        gestureRef.current.isPanning  = false;
        gestureRef.current.isPinching = false;
        // Flush any pending updates immediately
        if (panRafRef.current !== null) {
          cancelAnimationFrame(panRafRef.current);
          panRafRef.current = null;
          setPanOffsetMs(pendingPanRef.current);
        }
        if (zoomRafRef.current !== null) {
          cancelAnimationFrame(zoomRafRef.current);
          zoomRafRef.current = null;
          setWindowMs(pendingZoomRef.current);
        }
      },
      onPanResponderTerminate: () => {
        gestureRef.current.isPanning  = false;
        gestureRef.current.isPinching = false;
        if (panRafRef.current !== null) { cancelAnimationFrame(panRafRef.current); panRafRef.current = null; }
        if (zoomRafRef.current !== null) { cancelAnimationFrame(zoomRafRef.current); zoomRafRef.current = null; }
      },
    }),
  ).current;

  // ── Graph data ────────────────────────────────────────────────────────────
  const data = useMemo(() => {
    const now     = currentTime;
    const markers = planMarkers ?? [];

    // Resolve entries
    const entries: GraphEntry[] = overrideEntries
      ?? state.activeStopwatches.flatMap(sw => {
           const tp = state.types.find(t => t.id === sw.typeId);
           if (!tp) return [];
           const elapsed      = effectiveElapsed(sw, now);
           const adjustedStart = now - elapsed;
           return [{ type: tp, startTime: adjustedStart }];
         });

    // ── Auto time window ──────────────────────────────────────────────────
    let autoWStart: number;
    let autoWEnd:   number;

    if (entries.length === 0 && markers.length === 0) {
      autoWStart = now - 2 * 3_600_000;
      autoWEnd   = now + 2 * 3_600_000;
    } else if (entries.length === 0) {
      const mTimes = markers.map(m => m.startTime);
      autoWStart   = Math.min(...mTimes) - BUFFER_MS;
      autoWEnd     = Math.max(...mTimes) + 2 * 3_600_000;
    } else {
      const starts = entries.map(e => e.startTime);
      const ends   = entries.map(e => e.startTime + totalDuration(e.type));
      autoWStart   = Math.min(...starts, ...markers.map(m => m.startTime)) - BUFFER_MS;
      autoWEnd     = Math.max(Math.max(...ends), now, ...markers.map(m => m.startTime)) + BUFFER_MS;
    }

    // ── Apply zoom / pan ──────────────────────────────────────────────────
    let wStart: number;
    let wEnd:   number;

    if (windowMs > 0 || panOffsetMs !== 0) {
      const dur    = windowMs > 0 ? windowMs : (autoWEnd - autoWStart);
      const center = now + panOffsetMs;
      wStart = center - dur / 2;
      wEnd   = center + dur / 2;
    } else {
      wStart = autoWStart;
      wEnd   = autoWEnd;
    }

    const wDur = wEnd - wStart;

    // ── Y scale ───────────────────────────────────────────────────────────
    const sumPeaks = entries.reduce((s, e) => s + e.type.peakValue, 0);
    const maxY     = Math.max(sumPeaks, 1) * 1.15;

    // ── Coordinate mappers ────────────────────────────────────────────────
    const mapT = (t: number) => PAD.left + ((t - wStart) / wDur) * cw;
    const mapV = (v: number) => PAD.top + ch - Math.min(v / maxY, 1.05) * ch;

    // ── Sample the time axis ──────────────────────────────────────────────
    const times: number[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      times.push(wStart + (i / SAMPLES) * wDur);
    }

    // ── Sum values ────────────────────────────────────────────────────────
    const sumVals = times.map(t =>
      entries.reduce((s, e) => s + evaluate(e.type, t - e.startTime), 0),
    );

    // ── Split index (past vs future) ──────────────────────────────────────
    let splitIdx = times.findIndex(t => t >= now);
    if (splitIdx < 0) splitIdx = times.length;

    const sumPastPath   = buildPath(times, sumVals, 0, Math.min(splitIdx + 1, times.length), mapT, mapV);
    const sumFuturePath = buildPath(times, sumVals, Math.max(splitIdx - 1, 0), times.length, mapT, mapV);

    // ── Per-entry curves ──────────────────────────────────────────────────
    const swPaths = entries.map(e => {
      const vals = times.map(t => evaluate(e.type, t - e.startTime));
      return {
        color:  e.type.color,
        past:   buildPath(times, vals, 0, Math.min(splitIdx + 1, times.length), mapT, mapV),
        future: buildPath(times, vals, Math.max(splitIdx - 1, 0), times.length, mapT, mapV),
      };
    });

    // ── X-axis ticks ──────────────────────────────────────────────────────
    // Pick the smallest "nice" interval that gives ≤8 ticks across the window.
    // This handles auto windows wider than the manual zoom range (e.g. when a
    // plan marker is far in the future or a stopwatch started yesterday).
    const TICK_INTERVALS = [
      15 * 60_000,      //  15 min
      30 * 60_000,      //  30 min
       1 * 3_600_000,   //   1 h
       2 * 3_600_000,   //   2 h
       3 * 3_600_000,   //   3 h
       4 * 3_600_000,   //   4 h
       6 * 3_600_000,   //   6 h
      12 * 3_600_000,   //  12 h
      24 * 3_600_000,   //   1 day
    ];
    const MAX_TICKS = 8;
    const tickMs = TICK_INTERVALS.find(ms => wDur / ms <= MAX_TICKS) ?? 24 * 3_600_000;

    const firstTick = Math.ceil(wStart / tickMs) * tickMs;
    const xTicks: { x: number; label: string }[] = [];
    for (let t = firstTick; t <= wEnd; t += tickMs) {
      const d = new Date(t);
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      // For windows wider than 24h, prefix the weekday so labels stay unambiguous
      // when the same wall-clock time appears on multiple days.
      const prefix = wDur > 24 * 3_600_000
        ? `${['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()]} ` : '';
      xTicks.push({ x: mapT(t), label: `${prefix}${h}:${m}` });
    }

    // ── Y-axis ticks ──────────────────────────────────────────────────────
    const nicePeak = parseFloat(maxY.toFixed(1));
    const yTicks   = [0, nicePeak / 2, nicePeak].map(v => ({
      y:     mapV(v),
      label: v === 0 ? '0' : v.toFixed(1),
    }));

    const nowX = mapT(now);

    // ── Plan marker x-positions ───────────────────────────────────────────
    const planMarkerLines = markers.map(m => ({
      x:     mapT(m.startTime),
      label: m.label,
      color: m.color,
    }));

    return { sumPastPath, sumFuturePath, swPaths, xTicks, yTicks, nowX, planMarkerLines, wDur };
  }, [currentTime, state, overrideEntries, planMarkers, cw, ch, panOffsetMs, windowMs]);

  // Keep wDurRef in sync so gesture handlers always have the current value
  wDurRef.current = data.wDur;

  // ── Theme colours ─────────────────────────────────────────────────────────
  const sumColor  = Colors[colorScheme].tint;
  const textColor = isDark ? '#777' : '#888';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const axisColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';

  return (
    <View style={{ width, height }} {...panResponder.panHandlers}>
      <Svg width={width} height={height}>
        {/* Horizontal grid lines */}
        {data.yTicks.map((tick, i) => (
          <Line key={`hg-${i}`} x1={PAD.left} y1={tick.y} x2={PAD.left + cw} y2={tick.y} stroke={gridColor} strokeWidth={1} />
        ))}

        {/* Individual stopwatch curves (past, faint) */}
        {data.swPaths.map((p, i) =>
          p.past ? (
            <Path key={`swp-${i}`} d={p.past} stroke={p.color} strokeWidth={1.5} fill="none" strokeOpacity={0.45} />
          ) : null,
        )}

        {/* Individual stopwatch curves (future, very faint + dashed) */}
        {data.swPaths.map((p, i) =>
          p.future ? (
            <Path key={`swf-${i}`} d={p.future} stroke={p.color} strokeWidth={1.5} fill="none" strokeOpacity={0.2} strokeDasharray="5,4" />
          ) : null,
        )}

        {/* Sum curve — past (solid) */}
        {data.sumPastPath ? (
          <Path d={data.sumPastPath} stroke={sumColor} strokeWidth={2.5} fill="none" />
        ) : null}

        {/* Sum curve — future (dashed, half-opacity) */}
        {data.sumFuturePath ? (
          <Path d={data.sumFuturePath} stroke={sumColor} strokeWidth={2.5} fill="none" strokeOpacity={0.45} strokeDasharray="8,5" />
        ) : null}

        {/* Plan start-time markers — solid vertical line + label chip */}
        {data.planMarkerLines.map((m, i) => {
          const labelW = Math.min(m.label.length * 6 + 10, cw - (m.x - PAD.left) - 10);
          const labelX = m.x + 6;
          const labelY = PAD.top + 4 + i * 20;
          return (
            <G key={`pm-${i}`}>
              <Line
                x1={m.x} y1={PAD.top} x2={m.x} y2={PAD.top + ch}
                stroke={m.color} strokeWidth={2} strokeOpacity={0.8}
              />
              <Line
                x1={m.x - 4} y1={PAD.top + ch}
                x2={m.x + 4} y2={PAD.top + ch}
                stroke={m.color} strokeWidth={2.5} strokeOpacity={0.9}
              />
              <Rect
                x={labelX} y={labelY}
                width={labelW} height={16}
                rx={4} fill={m.color} opacity={0.2}
              />
              <SvgText
                x={labelX + 5} y={labelY + 11}
                fontSize={10} fontWeight="600" fill={m.color} opacity={1}
              >
                {m.label}
              </SvgText>
            </G>
          );
        })}

        {/* "Now" vertical line */}
        <Line x1={data.nowX} y1={PAD.top} x2={data.nowX} y2={PAD.top + ch} stroke="#FF6B6B" strokeWidth={1.5} strokeDasharray="4,3" />

        {/* X axis baseline */}
        <Line x1={PAD.left} y1={PAD.top + ch} x2={PAD.left + cw} y2={PAD.top + ch} stroke={axisColor} strokeWidth={1} />

        {/* Y axis */}
        <Line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + ch} stroke={axisColor} strokeWidth={1} />

        {/* X-axis tick marks and labels */}
        {data.xTicks.map((tick, i) => (
          <G key={`xt-${i}`}>
            <Line x1={tick.x} y1={PAD.top + ch} x2={tick.x} y2={PAD.top + ch + 4} stroke={textColor} strokeWidth={1} />
            <SvgText x={tick.x} y={height - 8} textAnchor="middle" fontSize={9} fill={textColor}>
              {tick.label}
            </SvgText>
          </G>
        ))}

        {/* Y-axis labels */}
        {data.yTicks.map((tick, i) => (
          <SvgText key={`yt-${i}`} x={PAD.left - 5} y={tick.y + 4} textAnchor="end" fontSize={9} fill={textColor}>
            {tick.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
});

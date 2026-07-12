/**
 * TourOverlay — renders the spotlight walkthrough driven by TourContext.
 *
 * Mounted once at the app root (app/_layout.tsx), sibling to the tab
 * navigator. For each step it navigates to the right tab, measures the
 * registered target (see store/tourTargets.ts) with `measureInWindow`, and
 * draws a dimmed full-screen mask with a cutout around the target plus a
 * callout bubble with an arrow pointing at it.
 *
 * Deliberately built with plain Views + the RN Animated API — no
 * react-native-reanimated (see project conventions) and no gesture
 * handling: this is a look-don't-touch walkthrough, not an interactive one.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { LayoutChangeEvent, View as RNView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TourStep, TourTab, useTour } from '@/store/TourContext';
import { getTourTargetRef } from '@/store/tourTargets';

type Rect = { x: number; y: number; width: number; height: number };

const TAB_PATH: Record<TourTab, string> = {
  explore: '/explore',
  plan: '/plan',
  interactions: '/interactions',
  settings: '/settings',
};

const HOLE_PADDING = 10;
const MEASURE_RETRY_MS = 80;
const MEASURE_MAX_TRIES = 25; // ~2s before giving up and falling back to a centered bubble
const GAP = 16;
const ARROW_SIZE = 14;

function measureStep(
  step: TourStep,
  onRect: (r: Rect | null) => void,
  triesRef: React.MutableRefObject<number>,
  screenW: number,
  screenH: number,
) {
  const ref = getTourTargetRef(step.targetId);
  const view = ref?.current as RNView | null | undefined;

  if (!view) {
    if (triesRef.current < MEASURE_MAX_TRIES) {
      triesRef.current += 1;
      setTimeout(() => measureStep(step, onRect, triesRef, screenW, screenH), MEASURE_RETRY_MS);
    } else {
      onRect({ x: screenW / 2 - 1, y: screenH / 2 - 1, width: 2, height: 2 });
    }
    return;
  }

  view.measureInWindow((x: number, y: number, width: number, height: number) => {
    if (width === 0 && height === 0) {
      if (triesRef.current < MEASURE_MAX_TRIES) {
        triesRef.current += 1;
        setTimeout(() => measureStep(step, onRect, triesRef, screenW, screenH), MEASURE_RETRY_MS);
      } else {
        onRect({ x: screenW / 2 - 1, y: screenH / 2 - 1, width: 2, height: 2 });
      }
      return;
    }
    onRect({ x, y, width, height });
  });
}

export function TourOverlay() {
  const { active, stepIndex, steps, next, prev, skip } = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { width: screenW, height: screenH } = useWindowDimensions();

  const step = steps[stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const triesRef = useRef(0);

  // Step 1: get onto the right tab.
  useEffect(() => {
    if (!active || !step) return;
    const target = TAB_PATH[step.tab];
    if (pathname !== target) {
      router.navigate(target as never);
    }
  }, [active, step, pathname, router]);

  // Step 2: once we're on the right tab, measure the target (with retries).
  useEffect(() => {
    if (!active || !step) {
      setRect(null);
      return;
    }
    const target = TAB_PATH[step.tab];
    if (pathname !== target) return; // waiting on navigation from the effect above

    triesRef.current = 0;
    setRect(null);
    fade.setValue(0);
    measureStep(step, setRect, triesRef, screenW, screenH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, pathname]);

  useEffect(() => {
    if (rect) {
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [rect, fade]);

  if (!active || !step) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={skip}>
      <Animated.View style={[styles.root, { opacity: rect ? fade : 0 }]}>
        {rect && <SpotlightMask rect={rect} screenW={screenW} screenH={screenH} isDark={isDark} />}
        {rect && (
          <Callout
            key={step.id}
            step={step}
            stepIndex={stepIndex}
            total={steps.length}
            rect={rect}
            screenW={screenW}
            screenH={screenH}
            isDark={isDark}
            onNext={next}
            onPrev={prev}
            onSkip={skip}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

function SpotlightMask({
  rect,
  screenW,
  screenH,
  isDark,
}: {
  rect: Rect;
  screenW: number;
  screenH: number;
  isDark: boolean;
}) {
  const hole = {
    x: Math.max(0, rect.x - HOLE_PADDING),
    y: Math.max(0, rect.y - HOLE_PADDING),
    width: rect.width + HOLE_PADDING * 2,
    height: rect.height + HOLE_PADDING * 2,
  };
  const dim = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.68)';
  const accent = '#4ECDC4';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(0, hole.y), backgroundColor: dim }]} />
      <View
        style={[
          styles.dim,
          { top: hole.y + hole.height, left: 0, right: 0, bottom: 0, backgroundColor: dim },
        ]}
      />
      <View
        style={[
          styles.dim,
          { top: hole.y, left: 0, width: Math.max(0, hole.x), height: hole.height, backgroundColor: dim },
        ]}
      />
      <View
        style={[
          styles.dim,
          {
            top: hole.y,
            left: hole.x + hole.width,
            right: 0,
            height: hole.height,
            backgroundColor: dim,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            top: hole.y,
            left: hole.x,
            width: hole.width,
            height: hole.height,
            borderRadius: Math.min(20, hole.height / 2),
            borderColor: accent,
          },
        ]}
      />
    </View>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Reserves room below the hole for the tab bar (its exact height isn't
// known here — this is a deliberately generous fixed buffer on top of the
// safe-area bottom inset).
const BOTTOM_CHROME_RESERVE = 66;
const EDGE_MARGIN = 12;

function Callout({
  step,
  stepIndex,
  total,
  rect,
  screenW,
  screenH,
  isDark,
  onNext,
  onPrev,
  onSkip,
}: {
  step: TourStep;
  stepIndex: number;
  total: number;
  rect: Rect;
  screenW: number;
  screenH: number;
  isDark: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const insets = useSafeAreaInsets();
  const bg = isDark ? '#1E2022' : '#fff';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subColor = isDark ? '#9BA1A6' : '#687076';
  const accent = '#4ECDC4';

  // Height isn't known until the bubble itself has laid out (the text can
  // wrap to any number of lines), so the first render is measured
  // off-screen and invisible, then repositioned once we know it.
  const [bubbleHeight, setBubbleHeight] = useState<number | null>(null);
  const onBubbleLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setBubbleHeight(prev => (prev === h ? prev : h));
  };

  const BUBBLE_W = Math.min(320, screenW - 32);
  const hole = {
    x: Math.max(0, rect.x - HOLE_PADDING),
    y: Math.max(0, rect.y - HOLE_PADDING),
    width: rect.width + HOLE_PADDING * 2,
    height: rect.height + HOLE_PADDING * 2,
  };
  const holeCenterX = hole.x + hole.width / 2;
  const holeBottom = hole.y + hole.height;
  const spaceBelow = screenH - holeBottom;
  const spaceAbove = hole.y;
  const placeBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;

  const bubbleLeft = clamp(holeCenterX - BUBBLE_W / 2, EDGE_MARGIN, Math.max(EDGE_MARGIN, screenW - EDGE_MARGIN - BUBBLE_W));

  const measured = bubbleHeight !== null;
  const h = bubbleHeight ?? 0;
  const idealTop = placeBelow ? holeBottom + GAP : hole.y - GAP - h;
  const minTop = insets.top + EDGE_MARGIN;
  const maxTop = Math.max(minTop, screenH - insets.bottom - BOTTOM_CHROME_RESERVE - h);
  const finalTop = measured ? clamp(idealTop, minTop, maxTop) : idealTop;

  // Only draw the little arrow tail when the bubble actually landed where
  // it was aimed — once clamping kicks in (e.g. the spotlighted element is
  // large and leaves no room), the bubble floats as a plain card instead of
  // pretending to point at something it no longer sits next to.
  const showArrow = measured && Math.abs(finalTop - idealTop) < 2;
  const arrowTop = placeBelow ? holeBottom + GAP / 2 - ARROW_SIZE / 2 : hole.y - GAP / 2 - ARROW_SIZE / 2;
  const arrowLeft = clamp(holeCenterX - ARROW_SIZE / 2, bubbleLeft + 16, bubbleLeft + BUBBLE_W - 16 - ARROW_SIZE);

  return (
    <>
      {showArrow && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: arrowTop,
            left: arrowLeft,
            width: ARROW_SIZE,
            height: ARROW_SIZE,
            backgroundColor: bg,
            transform: [{ rotate: '45deg' }],
          }}
        />
      )}
      <View
        onLayout={onBubbleLayout}
        style={[
          styles.bubble,
          {
            left: bubbleLeft,
            width: BUBBLE_W,
            top: finalTop,
            backgroundColor: bg,
            opacity: measured ? 1 : 0,
          },
        ]}
      >
        <View style={styles.bubbleHeader}>
          <Text style={[styles.stepCounter, { color: subColor }]}>
            {stepIndex + 1} of {total}
          </Text>
          <TouchableOpacity onPress={onSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.skipText, { color: subColor }]}>Skip</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: textColor }]}>{step.title}</Text>
        <Text style={[styles.body, { color: subColor }]}>{step.body}</Text>
        <View style={styles.buttonRow}>
          {stepIndex > 0 ? (
            <TouchableOpacity onPress={onPrev} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.backText, { color: subColor }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity onPress={onNext} style={[styles.nextBtn, { backgroundColor: accent }]}>
            <Text style={styles.nextText}>{stepIndex + 1 === total ? 'Done' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCounter: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  nextText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});

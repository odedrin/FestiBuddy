import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

type Layout = { y: number; height: number };

interface Props<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, dragHandle: React.ReactNode, isDragging: boolean) => React.ReactNode;
  onReorder: (newData: T[]) => void;
  /** Called when a drag starts/ends so a parent ScrollView can disable scrolling */
  onDragActive?: (active: boolean) => void;
}

export function DraggableList<T>({ data, keyExtractor, renderItem, onReorder, onDragActive }: Props<T>) {
  // activeIdx is only used for the dragging shadow style — position is driven purely via refs/Animated.
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Refs for values used inside gesture callbacks (avoid stale closures)
  const dataRef = useRef(data);
  dataRef.current = data;

  const activeIdxRef = useRef<number | null>(null);
  const hoverIdxRef  = useRef<number | null>(null);

  const layouts        = useRef<Layout[]>([]);
  const containerPageY = useRef(0);
  const containerRef   = useRef<View>(null);

  // One shift-animation per slot — grow array as needed, never shrink (avoids hook-order issues).
  // The dragged slot's animation is driven directly via setValue (no spring), so there is no
  // async React-state gate between "finger moves" and "item moves".
  const shiftAnims = useRef<Animated.Value[]>([]);
  while (shiftAnims.current.length < data.length) {
    shiftAnims.current.push(new Animated.Value(0));
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  function measureContainer() {
    containerRef.current?.measure((_x, _y, _w, _h, _px, py) => {
      containerPageY.current = py;
    });
  }

  function computeHoverIdx(pageY: number): number {
    const relY = pageY - containerPageY.current;
    const ls = layouts.current;
    for (let i = 0; i < ls.length; i++) {
      if (!ls[i]) continue;
      if (relY < ls[i].y + ls[i].height / 2) return i;
    }
    return Math.max(0, ls.length - 1);
  }

  function animateShifts(from: number, to: number) {
    const draggedH = layouts.current[from]?.height ?? 80;
    dataRef.current.forEach((_, i) => {
      if (i === from) return; // dragged slot is controlled directly, skip it here
      let shift = 0;
      if (from < to && i > from && i <= to) shift = -draggedH;
      else if (from > to && i >= to && i < from) shift = draggedH;
      Animated.spring(shiftAnims.current[i], {
        toValue: shift,
        useNativeDriver: true,
        bounciness: 0,
        speed: 22,
      }).start();
    });
  }

  function resetShifts() {
    shiftAnims.current.forEach(a =>
      Animated.spring(a, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 22 }).start(),
    );
  }

  function finishDrag() {
    const from = activeIdxRef.current!;
    const to   = hoverIdxRef.current ?? from;

    // Snap the dragged slot back to 0 immediately before springing everything else.
    shiftAnims.current[from]?.setValue(0);
    resetShifts();
    activeIdxRef.current = null;
    hoverIdxRef.current  = null;
    setActiveIdx(null);
    onDragActive?.(false);

    if (from !== to) {
      const nd = [...dataRef.current];
      const [moved] = nd.splice(from, 1);
      nd.splice(to, 0, moved);
      onReorder(nd);
    }
  }

  // ─── pan responders (one per positional slot) ──────────────────────────────
  // Recreated only when the list length changes; positional index is stable
  // between reorders, so this is safe.
  const panResponders = useMemo(
    () =>
      Array.from({ length: data.length }, (_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder:  (_, gs) => Math.abs(gs.dy) > 2,
          onPanResponderGrant: () => {
            measureContainer();
            // Snap any residual shift on this slot to 0 immediately (avoids leftover
            // spring values from a previous drag's resetShifts that hasn't settled yet).
            shiftAnims.current[index].setValue(0);
            activeIdxRef.current = index;
            hoverIdxRef.current  = index;
            setActiveIdx(index);
            onDragActive?.(true);
          },
          onPanResponderMove: (e, gs) => {
            // Drive the dragged slot directly — no React state gate, no async delay.
            shiftAnims.current[activeIdxRef.current!].setValue(gs.dy);
            const hi = computeHoverIdx(e.nativeEvent.pageY);
            if (hi !== hoverIdxRef.current) {
              hoverIdxRef.current = hi;
              animateShifts(activeIdxRef.current!, hi);
            }
          },
          onPanResponderRelease:   finishDrag,
          onPanResponderTerminate: finishDrag,
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.length],
  );

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <View ref={containerRef}>
      {data.map((item, index) => {
        const isDragging = activeIdx === index;

        const dragHandle = (
          <View
            {...panResponders[index].panHandlers}
            style={styles.handle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.handleIcon}>☰</Text>
          </View>
        );

        return (
          <Animated.View
            key={keyExtractor(item)}
            style={[
              isDragging && styles.dragging,
              {
                // All slots use shiftAnims — the dragged slot is driven via setValue,
                // all other slots are driven via springs in animateShifts/resetShifts.
                transform: [{ translateY: shiftAnims.current[index] }],
                zIndex: isDragging ? 100 : 1,
              },
            ]}
            onLayout={e => {
              layouts.current[index] = {
                y:      e.nativeEvent.layout.y,
                height: e.nativeEvent.layout.height,
              };
            }}
          >
            {renderItem(item, dragHandle, isDragging)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleIcon: {
    fontSize: 16,
    color: '#9BA1A6',
    lineHeight: 20,
  },
  dragging: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
    opacity: 0.96,
  },
});

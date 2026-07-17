"use client";

import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { cn } from "./cn";
import Spinner from "./Spinner";

const THRESHOLD = 72;

/**
 * Lightweight pull-to-refresh for scrollable app lists. Gesture-friendly;
 * respects reduced motion by skipping the rubber-band feel.
 */
export default function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const startY = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: TouchEvent) => {
    if (disabled || refreshing) return;
    if (window.scrollY > 2) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (disabled || refreshing || startY.current === 0) return;
    if (window.scrollY > 2) {
      setPull(0);
      return;
    }
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.45, THRESHOLD + 24));
  };

  const finish = useCallback(async () => {
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
        startY.current = 0;
      }
      return;
    }
    setPull(0);
    startY.current = 0;
  }, [onRefresh, pull, refreshing]);

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void finish()}
      onTouchCancel={() => {
        setPull(0);
        startY.current = 0;
      }}
    >
      <div
        className="app-ptr-indicator text-maroon"
        style={{ height: pull > 0 || refreshing ? Math.max(pull, refreshing ? 48 : 0) : 0 }}
        aria-hidden={!refreshing}
      >
        {(refreshing || pull >= THRESHOLD * 0.6) && (
          <Spinner className="h-5 w-5" />
        )}
      </div>
      {children}
    </div>
  );
}

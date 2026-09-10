"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

const STORAGE_KEY = "floating-player-position";
const DEFAULT_POSITION = { x: 20, y: 20 };
type Position = typeof DEFAULT_POSITION;

export function usePlayerPosition(ref: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const currentPosition = useRef(DEFAULT_POSITION);

  const move = useCallback((next: Position) => {
    const element = ref.current;
    if (!element) return;
    const bounded = {
      x: Math.max(8, Math.min(window.innerWidth - element.offsetWidth - 8, next.x)),
      y: Math.max(8, Math.min(window.innerHeight - element.offsetHeight - 8, next.y)),
    };
    currentPosition.current = bounded;
    setPosition(bounded);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
    } catch { /* Position still works when storage is unavailable. */ }
  }, [ref]);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    let initial = DEFAULT_POSITION;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) initial = saved;
    } catch { /* Ignore unavailable storage or an invalid saved position. */ }
    // ResizeObserver also runs on first observation and after expanding the player.
    currentPosition.current = initial;
    const constrain = () => move(currentPosition.current);
    const observer = new ResizeObserver(constrain);
    observer.observe(ref.current);
    window.addEventListener("resize", constrain);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", constrain);
      drag.current = null;
    };
  }, [enabled, move, ref]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!enabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX - position.x, y: event.clientY - position.y };
    setIsDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!enabled || drag.current?.id !== event.pointerId) return;
    move({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
  };
  const stopDrag = () => {
    drag.current = null;
    setIsDragging(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!enabled) return;
    const step = event.shiftKey ? 40 : 10;
    const offsets: Record<string, Position> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    };
    if (event.key === "Home") {
      event.preventDefault();
      move(DEFAULT_POSITION);
    } else if (offsets[event.key]) {
      event.preventDefault();
      move({ x: position.x + offsets[event.key].x, y: position.y + offsets[event.key].y });
    }
  };

  return { position, isDragging, dragHandleProps: {
    onPointerDown, onPointerMove, onPointerUp: stopDrag,
    onPointerCancel: stopDrag, onLostPointerCapture: stopDrag, onKeyDown,
  } };
}

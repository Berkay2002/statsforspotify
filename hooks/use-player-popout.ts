"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PictureInPictureWindow = Window & {
  documentPictureInPicture?: {
    requestWindow: (options: { width: number; height: number }) => Promise<Window>;
  };
};

export function usePlayerPopout() {
  const [popout, setPopout] = useState<Window | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<Window | null>(null);
  const opening = useRef(false);
  const mounted = useRef(false);

  const close = useCallback(() => {
    active.current?.close();
    active.current = null;
    setPopout(null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const closeOnLeave = () => active.current?.close();
    window.addEventListener("pagehide", closeOnLeave);
    return () => {
      mounted.current = false;
      window.removeEventListener("pagehide", closeOnLeave);
      active.current?.close();
      active.current = null;
    };
  }, []);

  const open = useCallback(async () => {
    if (active.current && !active.current.closed) {
      active.current.focus();
      return;
    }
    if (opening.current) return;
    const api = (window as PictureInPictureWindow).documentPictureInPicture;
    if (!api || !window.isSecureContext) {
      setError("Desktop pop-out is unavailable in this browser. Try a browser with Picture-in-Picture support, such as desktop Chrome or Edge. You can still drag the player here.");
      return;
    }
    opening.current = true;
    setError(null);
    let child: Window | null = null;
    try {
      // Called directly by the user's button click, preserving browser activation.
      child = await api.requestWindow({ width: 420, height: 480 });
      if (!mounted.current || child.closed) {
        child.close();
        return;
      }
      const doc = child.document;
      doc.title = "Now Playing · Stats for Spotify";
      doc.documentElement.className = document.documentElement.className;
      doc.documentElement.style.cssText = document.documentElement.style.cssText;
      doc.documentElement.lang = document.documentElement.lang;
      doc.body.className = document.body.className;
      const base = doc.createElement("base");
      base.href = document.baseURI;
      doc.head.append(base);
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const style = doc.createElement("style");
          style.textContent = Array.from(sheet.cssRules, rule => rule.cssText).join("\n");
          doc.head.append(style);
        } catch {
          if (sheet.href) {
            const link = doc.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href;
            doc.head.append(link);
          }
        }
      }
      doc.body.style.cssText = "margin:0;background:#000;color:white;min-height:100vh;color-scheme:dark;";
      active.current = child;
      child.addEventListener("pagehide", () => {
        if (active.current !== child) return;
        active.current = null;
        if (mounted.current) setPopout(null);
      }, { once: true });
      setPopout(child);
    } catch {
      child?.close();
      if (mounted.current) setError("The desktop player could not open. Allow Picture-in-Picture in your browser, then try again.");
    } finally {
      opening.current = false;
    }
  }, []);

  return { popout, open, close, error };
}

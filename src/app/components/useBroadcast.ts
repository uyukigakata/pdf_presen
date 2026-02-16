"use client";

import { useEffect, useMemo, useRef } from "react";

export type Msg =
  | { type: "PDF_READY"; pdfUrl: string }
  | { type: "NAVIGATE"; page: number }
  | { type: "LASER"; x: number; y: number };

export function useBroadcast(sid: string, onMessage: (m: Msg) => void) {
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const bc = new BroadcastChannel(`pdf-presenter:${sid}`);
    bcRef.current = bc;
    bc.onmessage = (ev) => onMessage(ev.data as Msg);
    return () => bc.close();
  }, [sid, onMessage]);

  const send = useMemo(() => {
    return (m: Msg) => bcRef.current?.postMessage(m);
  }, []);

  return { send };
}

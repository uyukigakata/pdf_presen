"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PdfCanvas from "@/components/PdfCanvas";
import { useBroadcast, Msg } from "@/components/useBroadcast";
import { makePdfId, loadNotes, saveNotes } from "@/lib/notes";

function newSid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PresenterPage() {
  const [sid] = useState(() => newSid());

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState<number>(0); // MVPでは未使用（後でPDF numPages読む）
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [timerStart] = useState(() => Date.now());
  const [tick, setTick] = useState(0);

  // timer
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const onMessage = useCallback((m: Msg) => {
    // Presenterは基本受けない（将来双方向化するならここ）
  }, []);
  const { send } = useBroadcast(sid, onMessage);

  const currentMemo = useMemo(() => notes[String(page)] ?? "", [notes, page]);

  const openAudience = () => {
    window.open(`/audience?sid=${sid}`, "audience");
    // audienceが開いた後に送る
    setTimeout(() => {
      if (pdfUrl) send({ type: "PDF_READY", pdfUrl });
      send({ type: "NAVIGATE", page });
    }, 300);
  };

  const onFile = async (file: File) => {
    const id = makePdfId(file);
    setPdfId(id);
    setNotes(loadNotes(id));
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPage(1);
    send({ type: "PDF_READY", pdfUrl: url });
    send({ type: "NAVIGATE", page: 1 });
  };

  const setMemo = (text: string) => {
    if (!pdfId) return;
    const next = { ...notes, [String(page)]: text };
    setNotes(next);
    saveNotes(pdfId, next);
  };

  const nextPage = () => {
    const p = page + 1;
    setPage(p);
    send({ type: "NAVIGATE", page: p });
  };
  const prevPage = () => {
    const p = Math.max(1, page - 1);
    setPage(p);
    send({ type: "NAVIGATE", page: p });
  };

  // キー操作
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextPage(); }
      if (e.key === "ArrowLeft" || e.key === "Backspace") { e.preventDefault(); prevPage(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pdfUrl]);

  // レーザーポインタ送信（現在スライドの上）
  const onMouseMove = (ev: React.MouseEvent<HTMLDivElement>) => {
    const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width;
    const y = (ev.clientY - rect.top) / rect.height;
    send({ type: "LASER", x, y });
  };

  return (
    <div style={{ height: "100vh", padding: 12, boxSizing: "border-box", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, fontFamily: "system-ui" }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
           onMouseMove={onMouseMove}>
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <PdfCanvas pdfUrl={pdfUrl} page={page} fit="contain" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="file" accept="application/pdf" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }} />
          <button onClick={openAudience}>Open Audience</button>
          <button onClick={prevPage}>←</button>
          <button onClick={nextPage}>→</button>
          <span>{page}{pageCount ? ` / ${pageCount}` : ""}</span>
          <span style={{ marginLeft: "auto" }}>{mm}:{ss}</span>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Next</div>
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PdfCanvas pdfUrl={pdfUrl} page={page + 1} fit="contain" />
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 8, display: "grid", gridTemplateRows: "auto 1fr", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>Notes (per page)</div>
          <textarea value={currentMemo} onChange={(e) => setMemo(e.target.value)}
            style={{ width: "100%", height: "100%", resize: "none", fontSize: 14, boxSizing: "border-box" }}
            placeholder="このページのメモ…" />
        </div>
      </div>
    </div>
  );
}

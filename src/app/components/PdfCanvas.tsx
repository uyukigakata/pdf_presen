"use client";

import React, { useEffect, useRef } from "react";
import { loadPdfjs } from "@/lib/pdf";

type Props = {
  pdfUrl: string | null;
  page: number;
  fit?: "contain" | "fixed";
  fixedScale?: number; // fit=fixed のとき
};

export default function PdfCanvas({ pdfUrl, page, fit = "contain", fixedScale = 1.6 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    let canceled = false;

    async function run() {
      if (!pdfUrl || !canvasRef.current) return;

      const pdfjs = await loadPdfjs();
      const loadingTask = pdfjs.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      if (canceled) return;
      pdfRef.current = pdf;

      const p = Math.max(1, Math.min(page, pdf.numPages));
      const pg = await pdf.getPage(p);
      if (canceled) return;

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      // スケール決定
      const baseViewport = pg.getViewport({ scale: 1 });

      let scale = fixedScale;
      if (fit === "contain") {
        const w = canvas.parentElement?.clientWidth ?? window.innerWidth;
        const h = canvas.parentElement?.clientHeight ?? window.innerHeight;
        scale = Math.min(w / baseViewport.width, h / baseViewport.height);
      }

      const viewport = pg.getViewport({ scale });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await pg.render({ canvasContext: ctx, viewport }).promise;
    }

    run();

    return () => {
      canceled = true;
    };
  }, [pdfUrl, page, fit, fixedScale]);

  return <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%" }} />;
}

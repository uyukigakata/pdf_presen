// 브라우ザでのみpdfjsをロードするためのヘルパ
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  // worker設定（CDN不要。Nextの静的配信下で動く形）
  // @ts-expect-error: pdfjs-distの型が環境により揺れる
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
  return pdfjs;
}

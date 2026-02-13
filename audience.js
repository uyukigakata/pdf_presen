import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.mjs";

const audCanvas = document.getElementById("audCanvas");
const overlay = document.getElementById("overlay");

let pdfDoc = null;
let pageNum = 1;
let pdfUrl = null;

async function renderAudiencePage(n) {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(n);

  // 画面にフィット（簡易）
  const scale = 2.0;
  const viewport = page.getViewport({ scale });

  const ctx = audCanvas.getContext("2d");
  audCanvas.width = Math.floor(viewport.width);
  audCanvas.height = Math.floor(viewport.height);

  // overlayも同サイズに
  overlay.width = audCanvas.width;
  overlay.height = audCanvas.height;

  await page.render({ canvasContext: ctx, viewport }).promise;
}

function drawLaser(xNorm, yNorm) {
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const x = xNorm * overlay.width;
  const y = yNorm * overlay.height;

  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,0,0,0.85)";
  ctx.fill();
}

window.addEventListener("message", async (ev) => {
  const msg = ev.data;
  if (!msg || !msg.type) return;

  if (msg.type === "PDF_READY") {
    pdfUrl = msg.pdfUrl;
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    pdfDoc = await loadingTask.promise;
    await renderAudiencePage(pageNum);
  }

  if (msg.type === "NAVIGATE") {
    pageNum = msg.page;
    await renderAudiencePage(pageNum);
  }

  if (msg.type === "LASER") {
    drawLaser(msg.x, msg.y);
  }
});

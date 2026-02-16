import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.mjs";

const audCanvas = document.getElementById("audCanvas");
const overlay = document.getElementById("overlay");

let pdfDoc = null;
let pageNum = 1;

async function renderAudiencePage(n) {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(n);

  // 画面にフィットさせる
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;

  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    containerWidth / viewport.width,
    containerHeight / viewport.height
  );

  const scaledViewport = page.getViewport({ scale });

  const ctx = audCanvas.getContext("2d");

  audCanvas.width = scaledViewport.width;
  audCanvas.height = scaledViewport.height;

  overlay.width = scaledViewport.width;
  overlay.height = scaledViewport.height;

  await page.render({
    canvasContext: ctx,
    viewport: scaledViewport,
  }).promise;
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
  if (!msg?.type) return;

  if (msg.type === "PDF_READY") {
    const loadingTask = pdfjsLib.getDocument(msg.pdfUrl);
    pdfDoc = await loadingTask.promise;
    pageNum = 1;
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

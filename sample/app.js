import { makePdfId, loadNotes, saveNotes } from "./storage.js";

// PDF.js（CDN）を使う：最短MVP
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.mjs";

const fileEl = document.getElementById("file");
const curCanvas = document.getElementById("curCanvas");
const nextCanvas = document.getElementById("nextCanvas");
const pageInfo = document.getElementById("pageInfo");
const memoEl = document.getElementById("memo");
const timerEl = document.getElementById("timer");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const openAudienceBtn = document.getElementById("openAudience");

let audienceWin = null;

let pdfDoc = null;
let pdfUrl = null;
let pdfId = null;
let pageNum = 1;
let pageCount = 0;
let notes = {}; // { [pageNum]: string }

let startAt = Date.now();
setInterval(() => {
  const s = Math.floor((Date.now() - startAt) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  timerEl.textContent = `${mm}:${ss}`;
}, 500);

async function renderPage(n, canvas, scale = 1.5) {
  const page = await pdfDoc.getPage(n);
  const viewport = page.getViewport({ scale });
  const ctx = canvas.getContext("2d");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
}

function syncAudienceNavigate() {
  if (!audienceWin) return;
  audienceWin.postMessage({ type: "NAVIGATE", page: pageNum }, "*");
}

function syncAudiencePdf() {
  if (!audienceWin || !pdfUrl) return;
  audienceWin.postMessage({ type: "PDF_READY", pdfUrl }, "*");
}

function syncLaser(xNorm, yNorm) {
  if (!audienceWin) return;
  audienceWin.postMessage({ type: "LASER", x: xNorm, y: yNorm }, "*");
}

function updateMemoUI() {
  memoEl.value = notes[String(pageNum)] ?? "";
}

function saveMemoFromUI() {
  notes[String(pageNum)] = memoEl.value;
  saveNotes(pdfId, notes);
}

async function refreshView() {
  if (!pdfDoc) return;
  pageInfo.textContent = `${pageNum} / ${pageCount}`;

  await renderPage(pageNum, curCanvas, 1.6);

  const nextPage = Math.min(pageNum + 1, pageCount);
  if (nextPage !== pageNum) {
    await renderPage(nextPage, nextCanvas, 0.9);
  } else {
    // 最終ページは次を空に
    const ctx = nextCanvas.getContext("2d");
    nextCanvas.width = 10; nextCanvas.height = 10;
    ctx.clearRect(0, 0, 10, 10);
  }

  updateMemoUI();
  syncAudienceNavigate();
}

fileEl.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  pdfId = makePdfId(file);
  notes = loadNotes(pdfId);

  // PDFはBlob URLで渡す（書式崩れなし）
  if (pdfUrl) URL.revokeObjectURL(pdfUrl);
  pdfUrl = URL.createObjectURL(file);

  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  pdfDoc = await loadingTask.promise;

  pageCount = pdfDoc.numPages;
  pageNum = 1;

  await refreshView();
  syncAudiencePdf();
});

prevBtn.addEventListener("click", async () => {
  if (!pdfDoc) return;
  pageNum = Math.max(1, pageNum - 1);
  await refreshView();
});
nextBtn.addEventListener("click", async () => {
  if (!pdfDoc) return;
  pageNum = Math.min(pageCount, pageNum + 1);
  await refreshView();
});

// ホットキー（最低限）
window.addEventListener("keydown", async (e) => {
  if (!pdfDoc) return;
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextBtn.click(); }
  if (e.key === "ArrowLeft" || e.key === "Backspace") { e.preventDefault(); prevBtn.click(); }
});

// メモ保存
memoEl.addEventListener("input", () => {
  if (!pdfId) return;
  saveMemoFromUI();
});

// Audienceを開く
openAudienceBtn.addEventListener("click", () => {
  if (!audienceWin || audienceWin.closed) {
    audienceWin = window.open("./audience.html", "audience", "noopener,noreferrer");
    // 少し待ってからPDFを送る
    setTimeout(() => { syncAudiencePdf(); syncAudienceNavigate(); }, 300);
  } else {
    audienceWin.focus();
  }
});

// レーザーポインタ（Presenterの現在スライド上のマウス位置を送る）
curCanvas.addEventListener("mousemove", (e) => {
  const rect = curCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  syncLaser(x, y);
});

export function makePdfId(file) {
  // MVP: 簡易ID（後でsha256に置換）
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function loadNotes(pdfId) {
  const raw = localStorage.getItem(`notes:${pdfId}`);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function saveNotes(pdfId, notesObj) {
  localStorage.setItem(`notes:${pdfId}`, JSON.stringify(notesObj));
}

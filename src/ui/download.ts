/** Save generated text/blob as a file. Nothing is sent anywhere: a local object URL is clicked. */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(name: string, text: string, type: string): void {
  // BOM so Excel opens UTF-8 (Chinese/Malay text) correctly.
  downloadBlob(name, new Blob(['﻿', text], { type: `${type};charset=utf-8` }));
}

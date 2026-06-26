// Shared helpers for exporting dashboard content as downloadable documents.
// Used by both the milestone report and the project operating-document download.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function documentFileStamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const BASE_DOC_CSS = `
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; margin: 40px; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 17px; margin: 0 0 6px; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 12px 0 6px; }
  h3.done-label { color: #059669; }
  .generated { color: #64748b; font-size: 13px; margin: 0 0 22px; text-transform: uppercase; letter-spacing: 1px; }
  .summary { display: flex; gap: 28px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 26px; }
  .summary div strong { display: block; font-size: 22px; }
  .summary div span { color: #64748b; font-size: 12px; }
  .section { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; page-break-inside: avoid; }
  .entry { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; page-break-inside: avoid; }
  .entry-head { display: flex; align-items: center; justify-content: space-between; }
  .entry-head h2 { font-size: 17px; margin: 0; }
  .pill { border: 1px solid #cbd5e1; border-radius: 999px; padding: 2px 12px; font-size: 12px; font-weight: 700; }
  .meta { color: #64748b; font-size: 13px; margin: 6px 0 10px; }
  ul { margin: 0; padding-left: 4px; list-style: none; }
  li { font-size: 14px; margin: 4px 0; }
  li.done { color: #047857; }
  li.open em { color: #94a3b8; font-style: normal; }
`;

export function wrapHtmlDocument(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${BASE_DOC_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Word opens an HTML payload with a .doc extension as a real document.
export function downloadHtmlAsDoc(html: string, filename: string) {
  downloadBlob(new Blob([html], { type: "application/msword" }), filename);
}

// Open a clean print window and trigger the browser's print dialog (Save as PDF).
export function printHtmlAsPdf(html: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=820,height=900");
  if (!printWindow) {
    return;
  }
  printWindow.document.write(
    html.replace(
      "</body>",
      "<script>window.onload=function(){window.focus();window.print();};</script></body>",
    ),
  );
  printWindow.document.close();
}

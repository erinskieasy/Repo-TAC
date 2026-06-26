import { escapeHtml, documentFileStamp, printHtmlAsPdf, wrapHtmlDocument } from "../tac/documentExport";
import type { OpportunityBrief } from "./types";

function slug(name: string): string {
  const value = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return value || "opportunity-brief";
}

// Markdown is the canonical export (with Markdown tables / structured formatting).
export function briefToMarkdown(brief: OpportunityBrief): string {
  const lines: string[] = [];
  lines.push(`# ${brief.metadata.name}`);
  lines.push("");
  lines.push(
    `| Author | Date | Version |`,
    `| --- | --- | --- |`,
    `| ${brief.metadata.author || "—"} | ${brief.metadata.date} | ${brief.metadata.version} |`,
  );
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(brief.executiveSummary.trim() || "_To be written._");
  lines.push("");

  for (const section of brief.sections) {
    lines.push(`## ${section.id}. ${section.title}`);
    lines.push("");
    lines.push(section.synthesis.trim() || "_Not yet synthesized._");
    if (section.assumptions.length > 0) {
      lines.push("");
      lines.push("**Assumptions**");
      lines.push("");
      for (const assumption of section.assumptions) {
        lines.push(`- ${assumption}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function briefToHtml(brief: OpportunityBrief): string {
  const sections = brief.sections
    .map((section) => {
      const assumptions = section.assumptions.length
        ? `<h3>Assumptions</h3><ul>${section.assumptions
            .map((assumption) => `<li>${escapeHtml(assumption)}</li>`)
            .join("")}</ul>`
        : "";
      return `
        <div class="section">
          <h2>${section.id}. ${escapeHtml(section.title)}</h2>
          <p>${escapeHtml(section.synthesis || "Not yet synthesized.").replace(/\n/g, "<br/>")}</p>
          ${assumptions}
        </div>`;
    })
    .join("");

  const body = `
    <h1>${escapeHtml(brief.metadata.name)}</h1>
    <p class="generated">${escapeHtml(brief.metadata.author || "—")} &middot; ${escapeHtml(brief.metadata.date)} &middot; ${escapeHtml(brief.metadata.version)}</p>
    <div class="section">
      <h2>Executive Summary</h2>
      <p>${escapeHtml(brief.executiveSummary || "To be written.").replace(/\n/g, "<br/>")}</p>
    </div>
    ${sections}`;

  return wrapHtmlDocument(brief.metadata.name, body);
}

function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadBriefMarkdown(brief: OpportunityBrief) {
  downloadText(
    briefToMarkdown(brief),
    `${slug(brief.metadata.name)}-${documentFileStamp()}.md`,
    "text/markdown",
  );
}

export function downloadBriefPdf(brief: OpportunityBrief) {
  printHtmlAsPdf(briefToHtml(brief));
}

// "Create new doc" — open the brief as a standalone rendered document in a new tab,
// with all the information in place plus a print / save-as-PDF control.
export function openBriefDocument(brief: OpportunityBrief) {
  const docWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
  if (!docWindow) {
    return;
  }
  const toolbar = `
    <div style="position:fixed;top:18px;right:18px;display:flex;gap:8px;">
      <button onclick="window.print()" style="border:0;border-radius:8px;background:#1d70e8;color:#fff;padding:9px 16px;font:600 14px system-ui;cursor:pointer;">Print / Save as PDF</button>
    </div>`;
  const html = briefToHtml(brief).replace("</body>", `${toolbar}</body>`);
  docWindow.document.write(html);
  docWindow.document.close();
}

import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { verifyQuote } from "./verify";

// Extract the plain text of a PDF, in the browser. Used for two things:
//  1. the "original contract" pane, and
//  2. verifying that every quote the model returns actually exists in the document.
// Non-PDF uploads (DOCX, images) return null — verification is then skipped and the
// UI says so, rather than pretending a quote was checked.
export async function extractPdfText(data: ArrayBuffer): Promise<string | null> {
  try {
    const doc = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
    }
    return pages.join("\n\n");
  } catch {
    return null;
  }
}

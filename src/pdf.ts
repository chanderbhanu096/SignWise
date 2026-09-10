import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { MAX_UPLOAD_BYTES, UploadError } from "./upload";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { verifyQuote } from "./verify";

export interface PreparedPdf {
  text: string | null;
  pages: number;
  images?: string[];
}

const IMAGE_PAINT = new Set<number>([
  pdfjs.OPS.paintXObject,
  pdfjs.OPS.paintImageMaskXObject,
  pdfjs.OPS.paintImageMaskXObjectGroup,
  pdfjs.OPS.paintImageXObject,
  pdfjs.OPS.paintInlineImageXObject,
  pdfjs.OPS.paintInlineImageXObjectGroup,
  pdfjs.OPS.paintImageXObjectRepeat,
  pdfjs.OPS.paintImageMaskXObjectRepeat,
  pdfjs.OPS.paintSolidColorImageMask,
]);
const DRAWING_PAINT = new Set<number>([
  pdfjs.OPS.stroke, pdfjs.OPS.closeStroke,
  pdfjs.OPS.fill, pdfjs.OPS.eoFill,
  pdfjs.OPS.fillStroke, pdfjs.OPS.eoFillStroke,
  pdfjs.OPS.closeFillStroke, pdfjs.OPS.closeEOFillStroke,
  pdfjs.OPS.shadingFill,
]);
const TEXT_PAINT = new Set<number>([
  pdfjs.OPS.showText, pdfjs.OPS.showSpacedText,
  pdfjs.OPS.nextLineShowText, pdfjs.OPS.nextLineSetSpacingShowText,
]);

// A blank page is not a scan. Only pages without extracted text or paint
// operations can be ignored when choosing text vs vision. A readable text layer
// can coexist with a photographed clause, vector lettering or a signature, so
// graphical content forces vision too. Decorative graphics may also trigger this
// conservative fallback; their contents cannot safely be inferred from metadata.
// Render every page in that case, including blanks, to retain page numbering and
// report no independent text verification. The original PDF stays in the browser.
export async function extractPdfText(data: ArrayBuffer, signal?: AbortSignal): Promise<PreparedPdf> {
  signal?.throwIfAborted();
  const task = pdfjs.getDocument({ data, isEvalSupported: false, stopAtErrors: true });
  const cancel = () => { void task.destroy(); };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const doc = await task.promise;
    signal?.throwIfAborted();
    if (doc.numPages > 12) throw new UploadError("too_many_pages");
    const pages: string[] = [];
    let hasContent = false;
    let needsVision = false;
    for (let i = 1; i <= doc.numPages; i++) {
      signal?.throwIfAborted();
      const page = await doc.getPage(i);
      const [content, operators] = await Promise.all([page.getTextContent(), page.getOperatorList()]);
      signal?.throwIfAborted();
      const text = content.items.map((it) => "str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "").join("");
      pages.push(text);
      const graphics = operators.fnArray.some((op) => IMAGE_PAINT.has(op) || DRAWING_PAINT.has(op));
      const textPaint = operators.fnArray.some((op) => TEXT_PAINT.has(op));
      const blank = !text.trim() && !graphics && !textPaint;
      if (blank) continue;
      hasContent = true;
      if (graphics || (text.match(/[\p{L}\p{N}]/gu) ?? []).length < 30) needsVision = true;
    }
    if (!hasContent) throw new UploadError("no_readable_content");
    if (!needsVision) {
      return { text: pages.join("\n\n"), pages: doc.numPages };
    }

    const images: string[] = [];
    let bytes = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      signal?.throwIfAborted();
      const page = await doc.getPage(i);
      const original = page.getViewport({ scale: 1 });
      if (!Number.isFinite(original.width) || !Number.isFinite(original.height) || original.width <= 0 || original.height <= 0) {
        throw new UploadError("unreadable_pdf");
      }
      const viewport = page.getViewport({ scale: Math.min(2, 1600 / Math.max(original.width, original.height)) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new UploadError("unreadable_pdf");
      try {
        await page.render({ canvasContext: context, viewport, background: "white" }).promise;
        signal?.throwIfAborted();
        const image = canvas.toDataURL("image/jpeg", 0.85);
        if (!image.startsWith("data:image/jpeg;base64,")) throw new UploadError("unreadable_pdf");
        const encoded = image.slice(image.indexOf(",") + 1);
        bytes += encoded.length * 3 / 4 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
        if (bytes > MAX_UPLOAD_BYTES) throw new UploadError("scan_too_large");
        images.push(image);
      } finally {
        canvas.width = canvas.height = 0;
      }
    }
    return { text: null, pages: doc.numPages, images };
  } catch (error) {
    signal?.throwIfAborted();
    if (error instanceof UploadError) throw error;
    throw new UploadError("unreadable_pdf");
  } finally {
    signal?.removeEventListener("abort", cancel);
    await task.destroy();
  }
}

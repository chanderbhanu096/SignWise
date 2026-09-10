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

// Text or vision. Vision is the fallback for a scan — a page with ink on it that
// the text layer does not account for — and it is expensive: the pages go to the
// model as unmasked pixels, redaction cannot run on an image, and no quote can be
// verified against a text layer afterwards.
//
// So the test is how much text the page actually yields, not whether anything was
// painted on it. Treating any paint operation as evidence of a scan sent 20 of 22
// ordinary readable PDFs down the vision path, because a table border, a letterhead
// logo and a signature rule are on nearly every contract. A page with a photographed
// clause and a real text layer is therefore read as text: the model sees what the
// text layer holds, which is a smaller loss than sending someone's whole contract as
// pixels for the sake of a picture we cannot measure.
//
// When vision is chosen, every page is rendered including blanks, so page numbering
// still matches the file. The original PDF stays in the browser either way.
export async function extractPdfText(data: ArrayBuffer, signal?: AbortSignal): Promise<PreparedPdf> {
  signal?.throwIfAborted();
  const task = pdfjs.getDocument({ data, isEvalSupported: false, stopAtErrors: true });
  const cancel = () => { void task.destroy(); };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const doc = await task.promise;
    signal?.throwIfAborted();
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
      if (graphics && (text.match(/[\p{L}\p{N}]/gu) ?? []).length < 30) needsVision = true;
    }
    if (!hasContent) throw new UploadError("no_readable_content");
    if (!needsVision) {
      return { text: pages.join("\n\n"), pages: doc.numPages };
    }
    // The page limit bounds the vision payload, which is megabytes of JPEG. Extracted
    // text is bounded by its own character limit on the server, so a long readable
    // contract is not rejected for being long.
    if (doc.numPages > 12) throw new UploadError("too_many_pages");

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
        // intent "print": the default display intent schedules its work through
        // requestAnimationFrame, which a browser stops delivering to a background
        // tab — the render promise then never settles and the upload hangs on
        // "reading your contract" with no error and no timeout. Print intent is
        // scheduled on microtasks instead, and draws the same page.
        await page.render({ canvasContext: context, viewport, background: "white", intent: "print" }).promise;
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

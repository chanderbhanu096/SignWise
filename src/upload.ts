export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type UploadValidationError = "unsupported_type" | "too_large";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ACCEPTED_FILE_EXTENSION = /\.(pdf|jpe?g|png|webp)$/i;

// Some browsers omit the MIME type for local files, so the extension is a
// deliberate fallback. DOCX is not offered until the API can actually read it.
export function validateContractFile(file: Pick<File, "name" | "size" | "type">): UploadValidationError | null {
  const type = file.type.toLowerCase();
  const supported =
    ACCEPTED_MIME_TYPES.has(type) ||
    ((!type || type === "application/octet-stream") && ACCEPTED_FILE_EXTENSION.test(file.name));
  if (!supported) return "unsupported_type";
  if (file.size > MAX_UPLOAD_BYTES) return "too_large";
  return null;
}

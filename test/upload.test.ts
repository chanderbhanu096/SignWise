import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_UPLOAD_BYTES, validateContractFile } from "../src/upload.ts";

const file = (name: string, type: string, size = 1024) => ({ name, type, size });

test("upload validation accepts only formats the API can currently read", () => {
  assert.equal(validateContractFile(file("contract.pdf", "application/pdf")), null);
  assert.equal(validateContractFile(file("scan.JPG", "image/jpeg")), null);
  assert.equal(validateContractFile(file("photo.webp", "")), null);
  assert.equal(validateContractFile(file("not-really-a-pdf.pdf", "text/plain")), "unsupported_type");
  assert.equal(
    validateContractFile(
      file("contract.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ),
    "unsupported_type",
  );
  assert.equal(validateContractFile(file("notes.txt", "text/plain")), "unsupported_type");
});

test("upload validation enforces the displayed 4 MB limit", () => {
  assert.equal(validateContractFile(file("contract.pdf", "application/pdf", MAX_UPLOAD_BYTES)), null);
  assert.equal(validateContractFile(file("contract.pdf", "application/pdf", MAX_UPLOAD_BYTES + 1)), "too_large");
});

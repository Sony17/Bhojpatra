import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidPdfHeader,
  generateShareToken,
  newAttachmentId,
  newEnquiryId,
  ENQUIRY_MAX_BYTES,
} from "./enquiries";

describe("enquiries module", () => {
  it("isValidPdfHeader correctly validates valid PDF headers", () => {
    const validPdfBuffer = Buffer.from("%PDF-1.7\n%some binary data");
    assert.equal(isValidPdfHeader(validPdfBuffer), true);
  });

  it("isValidPdfHeader rejects non-PDF headers", () => {
    const textBuffer = Buffer.from("Hello world, this is plain text.");
    assert.equal(isValidPdfHeader(textBuffer), false);

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(isValidPdfHeader(pngBuffer), false);

    const shortBuffer = Buffer.from("%PD");
    assert.equal(isValidPdfHeader(shortBuffer), false);
  });

  it("generateShareToken generates unique 48-character hex strings", () => {
    const token1 = generateShareToken();
    const token2 = generateShareToken();
    assert.equal(token1.length, 48);
    assert.equal(/^[0-9a-f]{48}$/.test(token1), true);
    assert.notEqual(token1, token2);
  });

  it("newAttachmentId generates properly formatted IDs", () => {
    const id = newAttachmentId();
    assert.equal(id.startsWith("ATT-"), true);
    assert.equal(id.length, 12);
  });

  it("newEnquiryId generates properly formatted IDs", () => {
    const id = newEnquiryId();
    assert.equal(id.startsWith("ENQ-"), true);
    assert.equal(id.length, 10);
  });

  it("ENQUIRY_MAX_BYTES is 10 MB", () => {
    assert.equal(ENQUIRY_MAX_BYTES, 10 * 1024 * 1024);
  });
});

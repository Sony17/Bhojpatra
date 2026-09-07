import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POST } from "@/app/api/contact/route";
import { GET as getAttachment } from "@/app/api/enquiries/attachment/[id]/route";
import { readEnquiries } from "@/lib/enquiries";

describe("Contact & Custom Catering API routes", () => {
  it("POST /api/contact validates mobile numbers", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test@example.com",
        phone: "123", // invalid
        subject: "General",
        message: "Hello",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /10-digit mobile/i);
  });

  it("POST /api/contact handles standard JSON enquiry", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Standard Contact User",
        email: "contact@example.com",
        phone: "9876543210",
        subject: "Wedding Question",
        message: "Can you provide servers in Lucknow?",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(typeof data.id, "string");
  });

  it("POST /api/contact rejects non-PDF files in multipart submission", async () => {
    const form = new FormData();
    form.append("name", "Faulty Upload User");
    form.append("phone", "9876543210");
    form.append("email", "faulty@example.com");
    form.append("eventType", "Reception");
    form.append("requirements", "Need food.");

    // Fake text file named as pdf
    const fakeFile = new File(["This is just text not a real PDF"], "menu.txt", {
      type: "text/plain",
    });
    form.append("menuPdf", fakeFile);

    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      body: form,
    });

    const res = await POST(req);
    assert.equal(res.status, 415);
    const data = await res.json();
    assert.match(data.error, /Only PDF files are accepted/i);
  });

  it("POST /api/contact handles custom catering with valid PDF and tokenized streaming", async () => {
    const form = new FormData();
    form.append("name", "Custom Feast Host");
    form.append("phone", "9876543211");
    form.append("email", "host@example.com");
    form.append("eventType", "Grand Feast");
    form.append("eventDate", "2026-11-20");
    form.append("city", "Lucknow");
    form.append("guests", "350");
    form.append("budget", "₹1,200/plate");
    form.append("requirements", "Awadhi dum biryani, galouti kebabs, live pan counter.");

    // Create valid PDF buffer with header
    const validPdfBytes = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
    );
    const pdfFile = new File([validPdfBytes], "awadh-feast-menu.pdf", {
      type: "application/pdf",
    });
    form.append("menuPdf", pdfFile);

    const postReq = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      body: form,
    });

    const postRes = await POST(postReq);
    assert.equal(postRes.status, 201);
    const postData = await postRes.json();
    assert.equal(postData.ok, true);
    assert.equal(typeof postData.id, "string");

    // Verify stored enquiry
    const allEnquiries = await readEnquiries();
    const created = allEnquiries.find((e) => e.id === postData.id);
    assert.ok(created);
    assert.equal(created.source, "custom-catering");
    assert.equal(created.eventType, "Grand Feast");
    assert.equal(created.guests, 350);
    assert.ok(created.attachment);
    assert.equal(created.attachment.originalName, "awadh-feast-menu.pdf");
    assert.ok(created.attachment.shareToken);

    const attId = created.attachment.id;
    const shareToken = created.attachment.shareToken;

    // Test unauthorized access (no admin cookie, no token)
    const unauthReq = new Request(
      `http://localhost:3000/api/enquiries/attachment/${attId}`,
    );
    const unauthRes = await getAttachment(unauthReq, {
      params: Promise.resolve({ id: attId }),
    });
    assert.equal(unauthRes.status, 401);

    // Test unauthorized access with invalid token
    const wrongTokenReq = new Request(
      `http://localhost:3000/api/enquiries/attachment/${attId}?token=invalid-token-123456789012345678901234`,
    );
    const wrongTokenRes = await getAttachment(wrongTokenReq, {
      params: Promise.resolve({ id: attId }),
    });
    assert.equal(wrongTokenRes.status, 401);

    // Test authorized access with valid scoped share token
    const authReq = new Request(
      `http://localhost:3000/api/enquiries/attachment/${attId}?token=${shareToken}`,
    );
    const authRes = await getAttachment(authReq, {
      params: Promise.resolve({ id: attId }),
    });
    assert.equal(authRes.status, 200);
    assert.equal(authRes.headers.get("Content-Type"), "application/pdf");
    assert.match(
      authRes.headers.get("Content-Disposition") ?? "",
      /awadh-feast-menu\.pdf/,
    );
  });
});

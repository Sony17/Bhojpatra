import { test } from "node:test";
import assert from "node:assert/strict";
import { isLinkedPhotoUrl, photoNeedsUnoptimized } from "./photoLinks";

test("photo links: only plain https URLs are accepted", () => {
  assert.equal(isLinkedPhotoUrl("https://cdn.example.com/dish.jpg"), true);
  assert.equal(isLinkedPhotoUrl("http://cdn.example.com/dish.jpg"), false);
  assert.equal(isLinkedPhotoUrl("javascript:alert(1)"), false);
  assert.equal(isLinkedPhotoUrl("data:image/png;base64,AAAA"), false);
  assert.equal(isLinkedPhotoUrl("https://user:pw@cdn.example.com/x.jpg"), false);
  assert.equal(isLinkedPhotoUrl("/api/vendor/photo/abc"), false);
  assert.equal(isLinkedPhotoUrl("https://x.com/" + "a".repeat(700)), false);
  assert.equal(isLinkedPhotoUrl(undefined), false);
});

test("photo links: allow-listed hosts stay optimized, others render direct", () => {
  assert.equal(photoNeedsUnoptimized("https://cdn.example.com/dish.jpg"), true);
  assert.equal(photoNeedsUnoptimized("https://images.unsplash.com/photo-1"), false);
  assert.equal(photoNeedsUnoptimized("/api/vendor/photo/abc"), false);
  assert.equal(photoNeedsUnoptimized(undefined), false);
});

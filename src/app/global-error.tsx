"use client";

import { useEffect } from "react";
import { brand } from "@/lib/design-tokens";

/**
 * Last-resort boundary — replaces the root layout when the failure happens
 * *above* `app/error.tsx` (in the layout itself or one of its providers), so
 * neither the language context nor the design-system CSS can be relied on here.
 *
 * Everything is therefore self-contained: own <html>/<body> (required by Next),
 * inline styles in the four brand colours only, and both languages shown at
 * once since there is no context to pick one. `metadata` is unsupported in this
 * file, so the tab title uses React's <title>.
 */
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error("[bhojpatra] global error", error.digest ?? "", error);
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    // global-error must render its own html and body tags.
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: brand.cream,
          color: brand.black,
          fontFamily:
            "'Open Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <title>Something went wrong — Bhojpatra</title>
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "24px",
            backgroundColor: brand.white,
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: `0 18px 40px rgba(0, 0, 0, 0.12)`,
          }}
        >
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "26px",
              fontWeight: 700,
              color: brand.red,
              letterSpacing: "0.01em",
            }}
          >
            bhojpatra
          </p>
          <h1
            style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: 700 }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: "14px",
              lineHeight: 1.6,
              color: `rgba(0, 0, 0, 0.6)`,
            }}
          >
            We couldn&apos;t load the page. Nothing has been booked or charged.
          </p>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: "14px",
              lineHeight: 1.6,
              color: `rgba(0, 0, 0, 0.6)`,
            }}
          >
            पेज लोड नहीं हो सका। आपकी कोई बुकिंग या भुगतान नहीं हुआ है।
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => (retry ? retry() : window.location.reload())}
              style={{
                cursor: "pointer",
                border: `1px solid ${brand.red}`,
                borderRadius: "999px",
                backgroundColor: brand.red,
                color: brand.white,
                padding: "11px 22px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Try again
            </button>
            {/* A plain <a>, deliberately: this boundary is live because the
                root layout failed, so a client-side next/link navigation would
                only re-enter the same broken tree. A full document load is the
                recovery. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-block",
                border: `1px solid ${brand.red}`,
                borderRadius: "999px",
                backgroundColor: brand.white,
                color: brand.red,
                padding: "11px 22px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                margin: "18px 0 0",
                fontSize: "11px",
                color: `rgba(0, 0, 0, 0.45)`,
              }}
            >
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}

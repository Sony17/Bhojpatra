"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { decodeInvoice, downloadInvoice, invoiceShareUrl } from "@/lib/invoice";
import { useLang } from "@/lib/i18n";
import InvoicePreview from "./InvoicePreview";

/**
 * Public, shareable invoice viewer. The whole invoice travels in the `?d=`
 * query (see `invoiceShareUrl`), so a recipient can open the link without an
 * account or our backend, preview the branded invoice and download the exact
 * same PDF. No data is read from the opener's device.
 */
export default function InvoiceViewer() {
  const { t } = useLang();
  const params = useSearchParams();
  const token = params.get("d");
  const data = useMemo(() => (token ? decodeInvoice(token) : null), [token]);

  if (!data) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Invoice not found", "इनवॉइस नहीं मिला")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t(
            "This invoice link is incomplete or has expired. Please ask for a fresh link.",
            "यह इनवॉइस लिंक अधूरा या समाप्त हो गया है। कृपया नया लिंक माँगें।",
          )}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream transition hover:bg-maroon-dark"
        >
          {t("Back to Bhojpatra", "भोजपत्र पर वापस")}
        </Link>
      </div>
    );
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `${t("Bhojpatra invoice", "भोजपत्र इनवॉइस")} ${data.id} — ${invoiceShareUrl(
      data,
    )}`,
  )}`;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-sm font-medium text-gold">
            {t("Shared Invoice", "साझा इनवॉइस")}
          </p>
          <h1 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
            {data.occasion} — {data.id}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => downloadInvoice(data)}
            className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
          >
            {t("Download PDF", "PDF डाउनलोड")}
          </button>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-maroon px-5 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
          >
            {t("Share", "साझा करें")}
          </a>
        </div>
      </div>

      <InvoicePreview data={data} />
    </div>
  );
}

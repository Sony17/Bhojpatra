"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { decodeInvoice, downloadInvoice, invoiceShareUrl } from "@/lib/invoice";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui";
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
        <Button href="/" variant="primary" className="mt-6">
          {t("Back to Bhojpatra", "भोजपत्र पर वापस")}
        </Button>
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
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
          <Button
            type="button"
            variant="primary"
            onClick={() => downloadInvoice(data)}
            className="shrink-0"
          >
            {t("Download PDF", "PDF डाउनलोड")}
          </Button>
          <Button
            href={waHref}
            variant="secondary"
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
          >
            {t("Share", "साझा करें")}
          </Button>
        </div>
      </div>

      <InvoicePreview data={data} />
    </div>
  );
}

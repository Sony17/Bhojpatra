"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { downloadInvoice, invoiceShareUrl, type InvoiceData } from "@/lib/invoice";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui";
import InvoicePreview from "./InvoicePreview";

/**
 * Public, shareable invoice viewer.
 * Fetches the authoritative, server-verified invoice using the booking ID and HMAC signature.
 * Rejects unsigned or arbitrary Base64url JSON tokens.
 */
export default function InvoiceViewer() {
  const { t } = useLang();
  const params = useSearchParams();
  const id = params.get("id");
  const sig = params.get("sig") ?? "";

  const [data, setData] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<string>(
    id ? "" : "Missing invoice reference.",
  );

  useEffect(() => {
    if (!id) return;

    let active = true;
    const fetchUrl = `/api/bookings/${encodeURIComponent(id)}/invoice${
      sig ? `?sig=${encodeURIComponent(sig)}` : ""
    }`;

    fetch(fetchUrl)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "Invoice not found or unauthorized.");
        }
        return res.json();
      })
      .then((json: { ok?: boolean; invoice?: InvoiceData }) => {
        if (active && json.invoice) {
          setData(json.invoice);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message);
          setData(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, sig]);

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="text-sm text-ink-soft">
          {t("Loading verified invoice…", "सत्यापित इनवॉइस लोड हो रहा है…")}
        </p>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Invoice not found", "इनवॉइस नहीं मिला")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t(
            "This invoice link is invalid, incomplete or has expired. Please ask for a fresh link.",
            "यह इनवॉइस लिंक अमान्य, अधूरा या समाप्त हो गया है। कृपया नया लिंक माँगें।",
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
      sig,
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

import QRCode from "qrcode";
import { buildUpiUri, isValidVpa } from "@/lib/upi";

// Renders a real, scannable UPI QR as SVG, generated on our own server (the
// merchant VPA is public, and nothing is sent to a third party). The encoded
// payload is a standard `upi://pay?...` deep-link, so any UPI app can scan it.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const vpa = url.searchParams.get("pa") ?? "";
  const payeeName = url.searchParams.get("pn") ?? "Bhojpatra Catering";
  const amount = Number(url.searchParams.get("am") ?? "0");
  const note = url.searchParams.get("tn") ?? undefined;
  const txnRef = url.searchParams.get("tr") ?? undefined;

  if (!isValidVpa(vpa) || !Number.isFinite(amount) || amount <= 0) {
    return new Response("Invalid UPI parameters", { status: 400 });
  }

  const uri = buildUpiUri({ vpa, payeeName, amount, note, txnRef });

  // Brand-only colours: black modules on white (both are brand colours).
  const svg = await QRCode.toString(uri, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

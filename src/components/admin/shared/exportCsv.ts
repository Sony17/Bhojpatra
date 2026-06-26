/**
 * Tiny client-side CSV export helper (no dependency). Reusable by any admin
 * table/report. Builds a CSV from an array of flat objects and triggers a
 * download. Safe no-op when there are no rows.
 */
export function exportCsv(
  filename: string,
  rows: Array<Record<string, string | number>>,
) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
